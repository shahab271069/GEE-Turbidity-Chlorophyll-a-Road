/****************************************************************************** 
* Script: Turbidity estimation using Sentinel 2 and Landsat 8 OLI             *
* Authors v1.0: Shahab Aldin Shojaeezadeh, Mehrdad Ghorbani Museloo           *                                           
* Date: August 5, 2021                                                        *
* Project: Norway Turbidity                                                   *
* Node: University of Adger                                                   *
* Contact: shahab2710@gmail.com                                               *   
*  Usage: Requires a Google Earth Engine account                              *
*                                                                             *
*  Parameters:                                                                *    
*    -Turbidity                                                               *
*    -Surface Temperature                                                     *
*    -Normalized Difference Chlorophyll Index                                 *
*    -Chlorophyll-a                                                           *
*    -Colored Dissolved Organic Matter                                        *
* 
*  No steps must be taken to modify the code to enable it to run.             *
*******************************************************************************/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////// STABLE INPUTS /////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// palettes //// 

//Masking Functions for Time Series Charts//
//Turbidity
var turb_totalMask = function(collection) {
  var mask_turb = function(image) {
    var turb_band = image.select('s2_turb');
    var mask = turb_band.gte(0.0).and(turb_band.lte(500))
    var masked_band = image.updateMask(mask);
    return masked_band;
  };
  var masked_turb = collection.map(mask_turb);
    function threshold(image) {
      return image.set('s2_turb', image.get('s2_turb'));}
  var final_turbColl = masked_turb.map(threshold);
  return final_turbColl;
}

//NDCI
var ndci_totalMask = function(collection) {
  var mask_ndci = function(image) {
    var ndci_band = image.select('NDCI');
    var mask = ndci_band.lte(1).and(ndci_band.gte(-1.0));
    var masked_band = image.updateMask(mask);
  return masked_band;
  };
  var masked_ndci = collection.map(mask_ndci);
  function threshold(image) {
    return image.set('NDCI', image.get('NDCI'));}
  var final_ndciColl = masked_ndci.map(threshold);
  return final_ndciColl;
};

//CHL
var chl_totalMask = function(collection) {
  var mask_chl = function (image) {
    var chl_band = image.select('s2_chl');
    var mask = chl_band.lte(70).gte(0);
    var masked_band = image.updateMask(mask);
  return masked_band;
  };
  var masked_chl = collection.map(mask_chl);
  function threshold(image) {
    return image.set('s2_chl', image.get('s2_chl'));}
  var final_chlColl = masked_chl.map(threshold);
  return final_chlColl;
}
    


////////////Visual Parameters//////////////
// Sentinel-2 Surface Reflectance 
var s2_viz = {
  bands: ['B4', 'B3', 'B2'],
  min: 0.0,
  max: 0.03,
  gamma: 0.80
};
// Turbidity
var turb_viz = {
  min:0,
  max:100,
  palette: ['332288', '88CCEE', '44AA99', '999933', 'DDCC77', 'CC6677', '882255', 'AA4499']
};
// NDCI
var ndci_viz = {
  bands: "NDCI",
  min:-1,
  max:1,
  palette: ['0000FF','3333FF','6666FF','9999FF','99FFCC','66FFB2','33FF99','00FF80']
};
// Chlorophyll-a
var mishra_viz = {
  bands: "s2_chl",
  min: 0,
  max: 50,
  palette: ['2372EF','23EF30']
};

// Options for selecting an area of interest
var all_roi = ['Norway'] // Norway Catchment
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////USER INTERFACE//////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//// style templates ////
var reminderTxtStyle = {fontSize: '12px', color: 'gray', margin: '0 0 0 10px'};
var borderStyle = '3px double steelblue';
var optionsTitleStyle = {fontSize: '18px', fontWeight: 'bold', textAlign: 'center', color: 'steelblue'};
var warningLabelStyle = {color: "#EB7B59", fontSize: '14px'};

////------------------------------panel for choosing language (AllPanels index 0)------------------------------------------ ////
////a dictionary containing lists with English and Spanish versions of the labels ////
var AllLabels = { 
  title: ['Water Quaity Assessment using Sentinel 2','Vannkvalitetsvurdering ved hjelp av Sentinel 2'],
  intro: ['This dashboard can be used to monitor the spatial and temporal variability of inland water quality in proximity to South of Norway.', 
          'Dette dashbordet kan brukes til å overvåke den romlige og tidsmessige variasjonen i innlandsvannskvalitet i nærheten av Sør -Norge.'],
  startDayLabel: ['Start Date:','Startdato:'],
  endDayLabel: ['End Date:', 'Sluttdato:'],
  yearWarningMsg: [
    "Note: including the initial year in analysis will only work if it start from 2017-01-01 to the current year.",
    "Merk: inkludert det første året i analyse vil bare fungere hvis det starter fra 2017-01-01 til inneværende år"
  ],
  assetInputPlaceholder: ["user/[username]/[asset name]", "user/[username]/[asset name]"],
  assetInstr: [
    "To use your own area of analysis, click the 'Assets' tab, then 'New' to upload a shapefile.  Once it's uploaded, click the asset, copy the table ID, and paste above.",
    "For å bruke ditt eget analyseområde, klikk på kategorien 'Assets' og deretter 'New' for å laste opp en formfil. Når den er lastet opp, klikker du på eiendelen, kopierer tabell -IDen og limer inn ovenfor."],
  mapDisplayTitle: ['Display Images on the Map', 'Vis bilder på kartet'],
  runbuttonLabel: ['Add Images to the Map', 'Legg til bilder på kartet'],
  resetbuttonLabel: ['Reset Map', 'Tilbakestill kart'],
  PITitle: ['Time Series Chart Generator of clicked point', 'Time Series Chart Generator av klikkpunkt'],
  PIInstr:[
    "Please choose a parameter and click a location on map to see how values for that point have changed over the selected time period.",
    "Velg en parameter og klikk på et sted på kartet for å se hvordan verdiene for det punktet har endret seg over den valgte tidsperioden."
    ],
  PRTitle: ['Time Series Chart Generator along the road','Time Series Chart Generator langs veien'],
  PRInstr: ["Define the road length and buffer area to see how values along the road have changed over the selected time period.",
  "Definer veglengden og bufferområdet for å se hvordan verdier langs veien har endret seg over den valgte tidsperioden."],
  RoadLengthLabel: ['Road Sections Length:','Vegdeler Lengde:'],
  BufferLengthLabel: ['Buffer Length:', 'Buffer Lengde:'],
  SectionSelectedLabel: ['Select a section (Note: section numbering start from the end of road).', 'Velg en seksjon (Merk: delenummerering starter fra slutten av veien).'],
  runbuttonSectionLabel: ['Set Length and Buffer Values','Angi lengde og bufferverdier'],
  mapinfopanelTitle: ["Just Added:", "Bare lagt til:"],
  exportTitle: ['Export to Google Drive', 'Eksporter til Google Disk'],
  exportInstr1: [
    'Select an image type to export. Exports options for the current image displayed on the map for the selected area will be generated.',
    'Velg en bildetype du vil eksportere. Eksportalternativer for det gjeldende bildet som vises på kartet for det valgte området, blir generert.'
    ],
  exportselectPlaceholder: ['Select an analysis type', 'Velg en analysetype'],
  exporterrormsg: ['An image type to export must be selected first.', 'En bildetype som skal eksporteres må velges først.'],
  ICimageExportButton: ['Export Images (GeoTIFF)', 'Eksporter bilder (GeoTIFF)'], 
  ICvideoExportButton: ['Export Image Collection as a video', "Eksporter bildesamling som en video"],
  exportInstr2: [
    "Click the 'Tasks' tab in the upper right panel of this screen, and then click 'Run' to export the image. Delete any spaces in the 'Task Name' before exporting the image.",
    "Klikk på 'Oppgaver' -fanen øverst til høyre på denne skjermen, og klikk deretter 'Kjør' for å eksportere bildet. Slett mellomrom i oppgavens navn før du eksporterer bildet."],
} ;

////___ Function that returns 0 if English is chosen, and 1 if Spanish is chosen ___////
var determinelanguage = function(){ 
  var x;
  if (languageselection.getValue()=='English')
  {x = 0}
  else if (languageselection.getValue()=='Norwegian')
  {x = 1}
  return x;
};

//Language list options
var languagelist = ['English', 'Norwegian'];

//// Selection widget ////
var languageselection = 
  ui.Select({
      items: languagelist,
      value: 'English',  //<-- Changing this value will set the default language that everything will appear in 
      onChange: function(){ //function that rewrites label and widget label values 456
        chosenlanguage = determinelanguage(); //redefine chosenlanguage variable
        ////setting value of IntroPanel widgets:
          IntroPanel.widgets().get(0).setValue(AllLabels.title[chosenlanguage]); //IntroPanel title
          IntroPanel.widgets().get(1).setValue(AllLabels.intro[chosenlanguage]); //IntroPanel instructions
        ////setting value of ParameterPanel widgets:
          DateSelectionPanel.widgets().get(0).setValue(AllLabels.startDayLabel[chosenlanguage]); //label for setting start year
          DateSelectionPanel.widgets().get(2).setValue(AllLabels.endDayLabel[chosenlanguage]); //label for setting end year
          // yearWarningMsg.setValue(AllLabels.yearWarningMsg[chosenlanguage]); //warning message that comes up when selecting the current year
          assetInputtxt.setPlaceholder(AllLabels.assetInputPlaceholder[chosenlanguage]); //placeholder for asset input textbox 
          assetInputPanel.widgets().get(1).setValue(AllLabels.assetInstr[chosenlanguage]); //instructions that come up when using your own asset as area of analysis
        ////setting value of MapDisplayPanel widgets:
          MapDisplayPanel.widgets().get(0).setValue(AllLabels.mapDisplayTitle[chosenlanguage]); //MapDisplayPanel title
          runbutton.setLabel(AllLabels.runbuttonLabel[chosenlanguage]); //'add images to map' button label
          resetbutton.setLabel(AllLabels.resetbuttonLabel[chosenlanguage]); //'reset map' button label
        ////setting value of ExportPanelWidgets:
          
         
        ////setting valueof PIPanel widgets:
          PIPanel.widgets().get(0).setValue(AllLabels.PITitle[chosenlanguage]);// title
          PIPanel.widgets().get(1).setValue(AllLabels.PIInstr[chosenlanguage]);// instr
          ////setting valueof PIPanel widgets:
          PRPanel.widgets().get(0).setValue(AllLabels.PRTitle[chosenlanguage]);// title
          PRPanel.widgets().get(1).setValue(AllLabels.PRInstr[chosenlanguage]);// instr
          PRPanel.widgets().get(2).setValue(AllLabels.RoadLengthLabel[chosenlanguage]);// length name
          PRPanel.widgets().get(4).setValue(AllLabels.BufferLengthLabel[chosenlanguage]);// buffer name
          runbuttonsection.setLabel(AllLabels.runbuttonSectionLabel[chosenlanguage]);
          //PRPanel.widgets().get(6).setValue(AllLabels.runbuttonSectionLabel[chosenlanguage]);// Add Section Length and Buffer Valus
          PRPanel.widgets().get(7).setValue(AllLabels.SectionSelectedLabel[chosenlanguage]);// Section name
          ////setting value of ExportPanelWidgets:
          ExportPanel.widgets().get(0).setValue(AllLabels.exportTitle[chosenlanguage]);// title
          ExportPanel.widgets().get(1).setValue(AllLabels.exportInstr1[chosenlanguage]);// instr1
          exportselect.setPlaceholder(AllLabels.exportselectPlaceholder[chosenlanguage]); //placeholder for the selection menu
          ICimageExport.setLabel(AllLabels.ICimageExportButton[chosenlanguage]);// export images button label
          exportInstr2.setValue(AllLabels.exportInstr2[chosenlanguage]);// instr2
      }
});

var chosenlanguage = determinelanguage(); //runs function and sets value of the global (default) chosenlanguage variable

///////////////////////////////////////////////
//// Panel with selection widget and label //// 
var LanguageSelectionPanel = ui.Panel([
 ui.Label('Language / Språk', {fontWeight: 'bold'}),
 languageselection
    ],ui.Panel.Layout.flow('horizontal'));

////------------------------------------------Panel for intro (AllPanels index 1)------------------------------------------------ ////
var IntroPanel = ui.Panel([
    ui.Label({
      value: AllLabels.title[chosenlanguage], //this will be a variable that changes based on language selection
      style: {fontWeight: 'bold', fontSize: '24px', margin: '10px 5px'}
    }),
    ui.Label({
      value: AllLabels.intro[chosenlanguage]
    }),
]);


////-----------------------------------Panel for setting analysis parameters (AllPanels index 2)------------------------------ ////
// Date Selection Panel =========================================================
// Define textboxes for user to input desired date range
var start_text = ui.Textbox({
      value: ('2017-01-01'), // arbitrary date 
      style: {margin:'5px 15px'}
});

var end_text = ui.Textbox({
        value: ('2021-08-03'), // arbitrary date 
        style: {margin:'5px 15px'}
});

// Final panel that holds the headings and textboxes to input date range for images
var DateSelectionPanel = ui.Panel({
  widgets: [
    /*0*/ ui.Label({value: AllLabels.startDayLabel[chosenlanguage], style: {fontWeight: "bold"} }),
    /*1*/ start_text,
    /*2*/ ui.Label({value: AllLabels.endDayLabel[chosenlanguage], style: {fontWeight: "bold"} }),
    /*3*/ end_text,
    ],
});

////////////////////////////////////////
//////////// Area Selection ////////////
////////////////////////////////////////
//// Setting the area of analysis -- to see what feature each variable corresponds to, go back to the beginning of the script ////
var norwayROI_select = ui.Select({
        items: all_roi, 
        value: "Norway",
        style: {margin: '5px 15px', width: '125px'},
        onChange: roi_selection
});



// Panel for to entering your own asset //
// Textbox to enter path to your asset
var assetInputtxt = ui.Textbox({
  placeholder: 'users/[username]/[asset name]',
  style: {width: '320px'}
});

// Panel that holds textbox and instructions for its use
var assetInputPanel = ui.Panel({
  widgets: [
    /*0*/ assetInputtxt,
    /*1*/ ui.Label(["To use your own area of analysis, click the 'Assets' tab on the top left corner. Then under the 'New' button select 'table upload' to upload a shapefile. Once it's uploaded, click the asset, copy the table ID, and paste above."])
    ]
});

// Panel for drawing your own asset //
var geoInputPanel = ui.Panel({
  widgets: [
    /*0*/ ui.Label(["To draw a geometry, hover on the 'Geometry Imports' tab (upper left, center screen) and click '+new Layer' at the bottom of the panel. Use the 'Draw a Rectangle' tool to make one polygon and keep it named 'geometry'. Re-run the tool in Google Earth Engine and then run analysis on your added geometry. Disregard these instructions if you have already completed the former steps."])
    ]
});


// Panel for selecting a general area that cause the more specific area panels to pop up (Belize, Honduras, Enter your own asset, Draw your own asset) //
var areaselect = ui.Select({
        items: ['Norway', 'Upload your own asset', 'Draw your own asset'],
        style: {margin: '5px 15px', width: '125px'},
        onChange: function(){
          if (areaselect.getValue() == 'Upload your own asset') {
            AreaSelectionPanel.widgets().set(2, assetInputPanel);
          } else if (areaselect.getValue() != 'Upload your own asset') {
            AreaSelectionPanel.widgets().remove(assetInputPanel);
          } if (areaselect.getValue() == 'Draw your own asset') {
            AreaSelectionPanel.widgets().set(2, geoInputPanel);
          } else if (areaselect.getValue() != 'Draw your own asset') {
            AreaSelectionPanel.widgets().remove(geoInputPanel);
          } if (areaselect.getValue() == 'Norway') {               
            AreaSelectionPanel.widgets().add(norwayROI_select);
          } else if (areaselect.getValue() != 'Norway') {
            AreaSelectionPanel.widgets().remove(norwayROI_select);
          }
        }
});

areaselect.setPlaceholder('Select an Area');

var AreaSelectionPanel = ui.Panel({
  widgets: [
    /*0*/ areaselect,
    //*1*/ assetInputPanel, // added to the panel if 'Upload your own asset' is selected
    //*2*/ geoInputPanel, // added to the panel is 'Draw your own asset' is selected
    ]
});

////////////////////////////////////////
/////// FINAL PARAMETERS PANEL /////////
////////////////////////////////////////
var ParametersPanel = ui.Panel({
  widgets: [
    /*0*/ DateSelectionPanel,
    /*1*/ AreaSelectionPanel,
    ]
  });
  
  
////--------------------------panel for displaying layers on map (index 3)---------------------------------------------------////
////Panel with checkboxes and legends (which are hidden on default) and buttons to add and remove layers to the map.
////For the land classification, NDVI, and NDWI checkboxes, checking the box will result in the legends being added to the panel.
////Unchecking will result in the panel being removed, though it's a little buggy when removing and then adding back.

///////////////////////////////////////////////////
///// Checkboxes for selecting layers to add /////
/////////////////////////////////////////////////

var turbCheckbox = ui.Checkbox({
  label: 'Turbidity / Turbiditet',
  onChange: function(){
    if (turbCheckbox.getValue()===true){
      legendsPanel.widgets().set(1, turbLegend);}
    else{legendsPanel.widgets().remove(turbLegend)}
  },
  //value: true ////sets the checkbox as checked by default
});

var ndciCheckbox = ui.Checkbox({
  label: 'Normalized Difference Chlorophyll Index / Normalisert forskjell Klorofyllindeks',
  onChange: function() {
    if (ndciCheckbox.getValue()===true){
      legendsPanel.widgets().set(2, ndciLegend);}
      else{legendsPanel.widgets().remove(ndciLegend)}
  }
});

var chlaCheckbox = ui.Checkbox({
  label: 'Chlorophyll-a / Klorofyll-a',
  onChange: function(){
    if (chlaCheckbox.getValue()===true){
      legendsPanel.widgets().set(3, chlaLegend);}
    else{legendsPanel.widgets().remove(chlaLegend)}
  },
  //value: true ////sets the checkbox as checked by default
});



// Panel to hold all the headings and all checkboxes
var checkboxesPanel = ui.Panel({
  widgets: [
    /*0*/ turbCheckbox,
    /*1*/ ndciCheckbox,
    /*2*/ chlaCheckbox,

    ]
});

/////////////////////////////////////////
//////// Legend Panels /////////////////
////////////////////////////////////////
////___ defines function that makes a color bar given a palette (used to make NDVI and NDWI color bars). Used in the thumbnail params ___/////
function makeColorBar(palette) {
  return {
    bbox: [0, 0, 1, 0.1],
    dimensions: '100x25',
    format: 'png',
    min: 0,
    max: 1,
    palette: palette
  };
}



///////// Turbidity  Legend /////////
//// Create the color bar for the legend ////
var turbColorBar = ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: makeColorBar(turb_viz.palette),
  style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '25px'},
});

//// Create a panel with two numbers for the legend. ////
var turbLegendLabels = ui.Panel({
  widgets: [
    ui.Label('0', {margin: '4px 8px'}),
    ui.Label('100', {margin: '4px 230px'})
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});


////the final panel for showing the turbidity legend ////
var turbLegend = ui.Panel({
  widgets: [
    ui.Label({
      value: 'Turbidity (FNU)',
      style: {
        fontWeight: 'bold',
        fontSize: '14px',
        margin: '0 0 4px 0',
        padding: '0'
      }
    }),
    turbColorBar,
    turbLegendLabels],
  style: {
    padding: '8px 15px'
  }
});

//////////////// NDCI Legend ///////////////////
//Create color bar for legend///
var ndciColorBar = ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: makeColorBar(ndci_viz.palette),
  style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '25px'},
});

//Create a panel with two numbers for the legend
var ndciLegendLabels = ui.Panel({
  widgets: [
    ui.Label('-1', {margin: '4px 8px'}),
    ui.Label('+1', {margin: '4px 230px'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
});

//Final panel for showing NDCI legend ////
var ndciLegend = ui.Panel({
  widgets: [
    ui.Label({
      value: 'NDCI',
      style: {
        fontWeight: 'bold',
        fontSize: '14px',
        margin: '0 0 4px 0',
        padding: '0'
      }
    }),
    ndciColorBar,
    ndciLegendLabels],
  style: {
    padding: '8px 15px'
  }
});

///////// Chlorophyll-a  Legend /////////
//// Create the color bar for the legend ////
var chlaColorBar = ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: makeColorBar(mishra_viz.palette),
  style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '25px'},
});

//// Create a panel with two numbers for the legend. ////
var chlaLegendLabels = ui.Panel({
  widgets: [
    ui.Label('0', {margin: '4px 8px'}),
    ui.Label('50', {margin: '4px 230px'})
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});


////the final panel for showing the Chl-a legend ////
var chlaLegend = ui.Panel({
  widgets: [
    ui.Label({
      value: 'Chl (mg/m^3)',
      style: {
        fontWeight: 'bold',
        fontSize: '14px',
        margin: '0 0 4px 0',
        padding: '0'
      }
    }),
    chlaColorBar,
    chlaLegendLabels],
  style: {
    padding: '8px 15px'
  }
});



////final panel holding all the legends //// 
//it is an empty by panel by default, so the legends will only appear when the corresponding checkbox is checked
var legendsPanel = ui.Panel({
  widgets:[
  /*1*/ ui.Panel(), //turbLegend,
  /*2*/ ui.Panel(), //ndciLegend
  /*3*/ ui.Panel(), //chlaLegend
  ]
});


///////////////////////////////////////////////////
//////////// Panel with the buttons //////////////
//////////////////////////////////////////////////
////___ first, define function that adds layers based on the checkboxes that are selected ___////
    
function DisplayTurb(collection){ 
    var S2_image = (collection.sort('CLOUDY_PIXEL_PERCENTAGE').first());
      if (turbCheckbox.getValue()===true)
        {Map.addLayer(S2_image.select('s2_turb'), turb_viz, 'Catchment' + ' Sentinel-2 Turbidity ')}
    }
    
function DisplayNDCI(collection){
    var S2_image = (collection.sort('CLOUDY_PIXEL_PERCENTAGE').first()); 
      if (ndciCheckbox.getValue()===true)
        {Map.addLayer(S2_image, ndci_viz, 'Catchment' + ' NDCI')}
    }  
    
function DisplayChla(collection){
    var S2_image = (collection.sort('CLOUDY_PIXEL_PERCENTAGE').first()); 
      if (chlaCheckbox.getValue()===true)
        {Map.addLayer(S2_image, mishra_viz, 'Catchment' + ' Chlorophyll-a ')}
    }

    


////the actual button: ////
var runbutton = ui.Button({
   label: AllLabels.runbuttonLabel[chosenlanguage],
   style: {width: '300px', color: 'steelblue', padding: '15px 5px 0px 5px'}, //I can't seem to get the button to be bigger!
   onClick: function(){
     var areaInput = setAreaOfInterest(areaselect.getValue());
     Map.centerObject(areaInput,11);
     var FinalCollections = createAnalysisIC(start_text.getValue(), end_text.getValue(), areaselect.getValue());
     // Run the DisplayLayers() function with FinalCollections as the input ////
     DisplayTurb(FinalCollections[1]); // Landsat 8 and Sentinel-2 Turb Collections
     DisplayNDCI(FinalCollections[2]); //Sentinel-2 Level 1C NDCI Collection
     DisplayChla(FinalCollections[3]); // Sentinel-2 Level 1C Chla Collection

  //   ////set width of the mapinfopanel and add text to the box ////
  //   mapinfopanel.style().set({width: '200px'});
  //   mapinfopanel.widgets().set(0,ui.Label({value: AllLabels.mapinfopanelTitle[chosenlanguage], style: {margin: "0px", fontWeight: "bold"}}));
  //   mapinfopanel.widgets().set(1,ui.Label({value: startyearselect.getValue() + "" + endyearselect.getValue() + ".", style: {margin: "0px"}}));
  //   mapinfopanel.widgets().set(2,ui.Label({value: areaselect.getValue() + ".", style: {margin: "0px"}}));
  }
  });

//Removes map layers to reset map
var resetbutton = ui.Button({
    label: AllLabels.resetbuttonLabel[chosenlanguage], 
    style: {width: '300px', color: '#EB7B59', padding: '5px 5px 15px 5px',},
    onClick: function reset(){
      ////remove all layers in the map, add in the Honduras and Belize MPAs layers again ////
      Map.layers().reset();
      Map.centerObject(Catchment,11)
      Map.addLayer(Catchment,{},'Catchment',true,0.5)
      Map.addLayer(Road,{},'Road',true,0.7)
      Map.addLayer(water_frequency_masked.clip(Catchment),{min:10,max:100,palette:['orange','yellow','lightblue','darkblue']},'Percentage of annual water occurence');
      Map.addLayer(Stations,{},'Stations',true,0.9)
    }
  });

////final panel that holds the buttons
var buttonsPanel = ui.Panel({
  widgets: [
    runbutton,
    resetbutton,
    ]
});


/////////////////////////////////////////////////
////FINAL PANEL FOR DISPLAYING LAYERS ON MAP ////
////////////////////////////////////////////////
var MapDisplayPanel = ui.Panel({
  widgets:[
    /*0*/ ui.Label({
      value: AllLabels.mapDisplayTitle[chosenlanguage],
      style: optionsTitleStyle, 
    }),
    /*1*/ checkboxesPanel,
    /*2*/ legendsPanel, ////even though it's empty by default, it must be added so the legends will show up
    /*3*/ buttonsPanel,
    ],
  style: {margin: '10px 0px 0px 0px', border: borderStyle},
});



/*
/////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
///////// Set up the maps and control widgets //////////////////
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
// Create the left map, and have it display layer 0.
var Map = ui.Map();

// Create a panel to hold title, intro text, chart and legend components.
var inspectorPanel = ui.Panel({style: {width: '30%'}});

// Create an intro panel with labels.
var intro = ui.Panel([
  ui.Label({
    value: 'Turbidity Estimation Based on Sentinel 2',
    style: {fontSize: '20px', fontWeight: 'bold'}
  }),
  ui.Label('Click a location to see its time series of Turbidity.')
]);
inspectorPanel.add(intro);

// Create panels to hold lon/lat values.
var lon = ui.Label();
var lat = ui.Label();
inspectorPanel.add(ui.Panel([lon, lat], ui.Panel.Layout.flow('horizontal')));

*/
// Create a panel with three numbers for the legend.
function ColorBar(palette) {
  return ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: {
      bbox: [0, 0, 1, 0.1],
      dimensions: '300x15',
      format: 'png',
      min: 0,
      max: 1,
      palette: palette,
    },
    style: {stretch: 'horizontal', margin: '0px 22px'},
  });
}
function makeLegend(lowLine, midLine, highLine,lowText, midText, highText, palette) {
  var  labelheader = ui.Label('Water occurrence during investigation period',{margin: '5px 17px', textAlign: 'center', stretch: 'horizontal', fontWeight: 'bold'});
  var labelLines = ui.Panel(
      [
        ui.Label(lowLine, {margin: '-4px 21px'}),
        ui.Label(midLine, {margin: '-4px 0px', textAlign: 'center', stretch: 'horizontal'}),
        ui.Label(highLine, {margin: '-4px 21px'})
      ],
      ui.Panel.Layout.flow('horizontal'));
      var labelPanel = ui.Panel(
      [
        ui.Label(lowText, {margin: '0px 14.5px'}),
        ui.Label(midText, {margin: '0px 0px', textAlign: 'center', stretch: 'horizontal'}),
        ui.Label(highText, {margin: '0px 1px'})
      ],
      ui.Panel.Layout.flow('horizontal'));
    return ui.Panel({
      widgets: [labelheader, ColorBar(palette), labelLines, labelPanel], 
      style: {position:'bottom-left'}});
}

Map.add(makeLegend('|', '|', '|', "0 %", '50 %', '100%', ['orange','yellow','lightblue','darkblue']))


//////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
///////////////////// Functions /////////////////////////////////
//////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
var roi_selection = function(roi) {
  
  return Catchment;
};
// Max search distance is 1 km.
var spatialFilter = ee.Filter.withinDistance({
  distance: 50,
  leftField: '.geo',
  rightField: '.geo',
  maxError: 10
})

// Function to set the area of interest based on the general region selected
function setAreaOfInterest(gen_select){
    
    return Catchment;
}
var Stations = ee.FeatureCollection(Station)

function createAnalysisIC(startDayInput, endDayInput, userselectarea){ //the function requires a start year (string), end year (string), and area (for clipping) inputs
    
    // Set area of interest. Runs the setAreaOfInterest function, using userselectarea as the input
    var areaInput = setAreaOfInterest(userselectarea);
    
    
    
    // Set the start and end dates of the collection from the user defined dates specified in the panel
    var start = startDayInput;
    var end = endDayInput;
    
        // import sentinel 1 and filter data series
    var s1 =  ee.ImageCollection('COPERNICUS/S1_GRD')
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
    .filterBounds(Catchment)
    .filterDate('2017-01-01','2020-12-31')
    //.filter(ee.Filter.contains({leftField: ".geo", rightValue: table})) // Filter partial S1-Images of table
    .map(function(image){return image.clip(Map.getBounds(true))})
    .map(function(image){return image.addBands(image.select('VV').focal_median(parseFloat('50'),'circle','meters').rename('VV_smoothed'))}); // Smooth S1-Images

    // Return the DN that maximizes interclass variance in S1-band (in the region).
    var otsu = function(histogram) {
      var counts = ee.Array(ee.Dictionary(histogram).get('histogram'));
      var means = ee.Array(ee.Dictionary(histogram).get('bucketMeans'));
      var size = means.length().get([0]);
      var total = counts.reduce(ee.Reducer.sum(), [0]).get([0]);
      var sum = means.multiply(counts).reduce(ee.Reducer.sum(), [0]).get([0]);
      var mean = sum.divide(total);
      
      var indices = ee.List.sequence(1, size);
      
    // Compute between sum of squares, where each mean partitions the data.
      var bss = indices.map(function(i) {
        var aCounts = counts.slice(0, 0, i);
        var aCount = aCounts.reduce(ee.Reducer.sum(), [0]).get([0]);
        var aMeans = means.slice(0, 0, i);
        var aMean = aMeans.multiply(aCounts)
            .reduce(ee.Reducer.sum(), [0]).get([0])
            .divide(aCount);
        var bCount = total.subtract(aCount);
        var bMean = sum.subtract(aCount.multiply(aMean)).divide(bCount);
        return aCount.multiply(aMean.subtract(mean).pow(2)).add(
               bCount.multiply(bMean.subtract(mean).pow(2)));
      });
      
    // Return the mean value corresponding to the maximum BSS.
      return means.sort(bss).get([-1]);
    };
    
    // return image with water mask as additional band
    var add_waterMask = function(image){
      // Compute histogram
      var histogram = image.select('VV').reduceRegion({
        reducer: ee.Reducer.histogram(255, 2)
          .combine('mean', null, true)
          .combine('variance', null, true), 
        geometry: areaInput, 
        scale: 10,
        bestEffort: true
      });
      // Calculate threshold via function otsu (see before)
      var threshold = otsu(histogram.get('VV_histogram'));
      
      // get watermask
      var waterMask = image.select('VV_smoothed').lt(threshold).rename('waterMask');
      waterMask = waterMask.updateMask(waterMask); //Remove all pixels equal to 0
      return image.addBands(waterMask);
    };
    
    s1 = s1.map(add_waterMask);
    //Calculating water occurrence
    var min_occurence = 90;
    var water_sum = s1.select('waterMask').reduce(ee.Reducer.sum());
    var water_frequency = water_sum.divide(s1.select('waterMask').size()).multiply(100);
    var water_masked = water_frequency.clip(areaInput).updateMask(water_frequency.gte(min_occurence));
    /*
    Export.image.toDrive({
    image: water_masked,
    description: 'Water_Mask_10', //generates the task/file name
    scale: 10, //meters per pixel
    maxPixels: 2e10, 
    region: areaInput.geometry() //sets the bounds of the exported image to be the area of interest
    })
    */
    // Defining function to create image collection for time specified for the different sensor collections // 
    function filterbyDateArea (start, end, areaInput){       
      var sentinel2_L1 = ee.ImageCollection('COPERNICUS/S2'); //1

      

      
      
      //Filtered dataset
      var filteredS2L1 = ee.ImageCollection(sentinel2_L1)
        .filterBounds(areaInput)
        .filterDate(start, end);
      
      // Atmospherically correct Sentinel-2 Level 1-C imagery with MAIN algorithm 
      // Defined in Page, et. al. (2019) +++++++++++++++++++++++++++++++++++++++++++++++++++ Fuller citation
      // Map MAIN on dataset
      var S2_Rrs = filteredS2L1.map(MAIN);
      // MAIN function
      function MAIN(img){
        var _0x9159=['tan','acos','B11','log','slice','normalizedDifference','B8A','updateMask','Image','B12','select','geometry','USGS/SRTMGL1_003','clip','Date','get','fromYMD','difference','day','int','add','subtract','cos','pow','multiply','divide','constant','MEAN_SOLAR_AZIMUTH_ANGLE','MEAN_SOLAR_ZENITH_ANGLE','sin','MEAN_INCIDENCE_ZENITH_ANGLE_B5','Array','SOLAR_IRRADIANCE_B2','SOLAR_IRRADIANCE_B3','SOLAR_IRRADIANCE_B4','SOLAR_IRRADIANCE_B5','SOLAR_IRRADIANCE_B6','SOLAR_IRRADIANCE_B7','SOLAR_IRRADIANCE_B8','SOLAR_IRRADIANCE_B11','toArray','arrayProject','arrayFlatten','addBands','exp','asin'];(function(_0x313dc6,_0x3aaea8){var _0x214232=function(_0x17272b){while(--_0x17272b){_0x313dc6['push'](_0x313dc6['shift']());}};_0x214232(++_0x3aaea8);}(_0x9159,0x1a6));var _0x4e93=function(_0x47914c,_0x2f8251){_0x47914c=_0x47914c-0x0;var _0x446de0=_0x9159[_0x47914c];return _0x446de0;};var pi=ee[_0x4e93('0x0')](3.141592);var bands=['B1','B2','B3','B4','B5','B6','B7','B8','B8A','B11',_0x4e93('0x1')];var rescale=img[_0x4e93('0x2')](bands)['divide'](0x2710);var footprint=rescale[_0x4e93('0x3')]();var DEM=ee[_0x4e93('0x0')](_0x4e93('0x4'))[_0x4e93('0x5')](footprint);var DU=ee[_0x4e93('0x0')](0x12c);var imgDate=ee[_0x4e93('0x6')](img[_0x4e93('0x7')]('system:time_start'));var FOY=ee[_0x4e93('0x6')][_0x4e93('0x8')](imgDate[_0x4e93('0x7')]('year'),0x1,0x1);var JD=imgDate[_0x4e93('0x9')](FOY,_0x4e93('0xa'))[_0x4e93('0xb')]()[_0x4e93('0xc')](0x1);var myCos=ee['Image'](0.0172)['multiply'](ee[_0x4e93('0x0')](JD)[_0x4e93('0xd')](ee[_0x4e93('0x0')](0x2)))[_0x4e93('0xe')]()[_0x4e93('0xf')](0x2);var cosd=myCos[_0x4e93('0x10')](pi[_0x4e93('0x11')](ee[_0x4e93('0x0')](0xb4)))['cos']();var d=ee[_0x4e93('0x0')](0x1)['subtract'](ee[_0x4e93('0x0')](0.01673))[_0x4e93('0x10')](cosd)[_0x4e93('0x5')](footprint);var SunAz=ee['Image'][_0x4e93('0x12')](img[_0x4e93('0x7')](_0x4e93('0x13')))[_0x4e93('0x5')](footprint);var SunZe=ee[_0x4e93('0x0')][_0x4e93('0x12')](img['get'](_0x4e93('0x14')))[_0x4e93('0x5')](footprint);var cosdSunZe=SunZe[_0x4e93('0x10')](pi[_0x4e93('0x11')](ee['Image'](0xb4)))[_0x4e93('0xe')]();var sindSunZe=SunZe[_0x4e93('0x10')](pi[_0x4e93('0x11')](ee[_0x4e93('0x0')](0xb4)))[_0x4e93('0x15')]();var SatZe=ee[_0x4e93('0x0')][_0x4e93('0x12')](img[_0x4e93('0x7')](_0x4e93('0x16')))[_0x4e93('0x5')](footprint);var cosdSatZe=SatZe[_0x4e93('0x10')](pi[_0x4e93('0x11')](ee['Image'](0xb4)))[_0x4e93('0xe')]();var sindSatZe=SatZe['multiply'](pi['divide'](ee[_0x4e93('0x0')](0xb4)))['sin']();var SatAz=ee[_0x4e93('0x0')][_0x4e93('0x12')](img[_0x4e93('0x7')]('MEAN_INCIDENCE_AZIMUTH_ANGLE_B5'))[_0x4e93('0x5')](footprint);var RelAz=SatAz[_0x4e93('0xd')](SunAz);var cosdRelAz=RelAz[_0x4e93('0x10')](pi[_0x4e93('0x11')](ee[_0x4e93('0x0')](0xb4)))[_0x4e93('0xe')]();var P=ee[_0x4e93('0x0')](0x18bcd)['multiply'](ee[_0x4e93('0x0')](0x1)[_0x4e93('0xd')](ee['Image'](0.0000225577)[_0x4e93('0x10')](DEM))[_0x4e93('0xf')](5.25588))[_0x4e93('0x10')](0.01);var Po=ee[_0x4e93('0x0')](1013.25);var ESUN=ee['Image'](ee[_0x4e93('0x17')]([ee[_0x4e93('0x0')](img[_0x4e93('0x7')]('SOLAR_IRRADIANCE_B1')),ee['Image'](img[_0x4e93('0x7')](_0x4e93('0x18'))),ee['Image'](img['get'](_0x4e93('0x19'))),ee[_0x4e93('0x0')](img[_0x4e93('0x7')](_0x4e93('0x1a'))),ee['Image'](img[_0x4e93('0x7')](_0x4e93('0x1b'))),ee[_0x4e93('0x0')](img[_0x4e93('0x7')](_0x4e93('0x1c'))),ee[_0x4e93('0x0')](img[_0x4e93('0x7')](_0x4e93('0x1d'))),ee[_0x4e93('0x0')](img[_0x4e93('0x7')](_0x4e93('0x1e'))),ee[_0x4e93('0x0')](img['get']('SOLAR_IRRADIANCE_B8A')),ee[_0x4e93('0x0')](img[_0x4e93('0x7')](_0x4e93('0x1f'))),ee[_0x4e93('0x0')](img[_0x4e93('0x7')](_0x4e93('0x18')))]))['toArray']()[_0x4e93('0x20')](0x1);ESUN=ESUN[_0x4e93('0x10')](ee[_0x4e93('0x0')](0x1));var ESUNImg=ESUN[_0x4e93('0x21')]([0x0])[_0x4e93('0x22')]([bands]);var imgArr=rescale[_0x4e93('0x2')](bands)[_0x4e93('0x20')]()['toArray'](0x1);var Ltoa=imgArr[_0x4e93('0x10')](ESUN)[_0x4e93('0x10')](cosdSunZe)[_0x4e93('0x11')](pi[_0x4e93('0x10')](d[_0x4e93('0xf')](0x2)));var bandCenter=ee[_0x4e93('0x0')](0x1bb)[_0x4e93('0x11')](0x3e8)['addBands'](ee[_0x4e93('0x0')](0x1ea)[_0x4e93('0x11')](0x3e8))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x230)['divide'](0x3e8))[_0x4e93('0x23')](ee['Image'](0x299)[_0x4e93('0x11')](0x3e8))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x2c1)[_0x4e93('0x11')](0x3e8))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x2e4)[_0x4e93('0x11')](0x3e8))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x30f)[_0x4e93('0x11')](0x3e8))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x34a)[_0x4e93('0x11')](0x3e8))['addBands'](ee['Image'](0x361)['divide'](0x3e8))['addBands'](ee[_0x4e93('0x0')](0x64a)[_0x4e93('0x11')](0x3e8))[_0x4e93('0x23')](ee['Image'](0x88e)[_0x4e93('0x11')](0x3e8))[_0x4e93('0x20')]()[_0x4e93('0x20')](0x1);var koz=ee[_0x4e93('0x0')](0.0039)[_0x4e93('0x23')](ee[_0x4e93('0x0')](0.0213))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0.1052))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0.0505))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0.0205))[_0x4e93('0x23')](ee['Image'](0.0112))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0.0075))['addBands'](ee[_0x4e93('0x0')](0.0021))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0.0019))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x0))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x0))[_0x4e93('0x20')]()[_0x4e93('0x20')](0x1);var Toz=koz[_0x4e93('0x10')](DU)[_0x4e93('0x11')](ee[_0x4e93('0x0')](0x3e8));var Lt=Ltoa[_0x4e93('0x10')](Toz[_0x4e93('0x10')](ee[_0x4e93('0x0')](0x1)[_0x4e93('0x11')](cosdSunZe)[_0x4e93('0xc')](ee[_0x4e93('0x0')](0x1)[_0x4e93('0x11')](cosdSatZe)))[_0x4e93('0x24')]());var Tr=P[_0x4e93('0x11')](Po)[_0x4e93('0x10')](ee[_0x4e93('0x0')](0.008569)[_0x4e93('0x10')](bandCenter[_0x4e93('0xf')](-0x4)))[_0x4e93('0x10')](ee[_0x4e93('0x0')](0x1)['add'](ee[_0x4e93('0x0')](0.0113)[_0x4e93('0x10')](bandCenter['pow'](-0x2)))[_0x4e93('0xc')](ee['Image'](0.00013)[_0x4e93('0x10')](bandCenter[_0x4e93('0xf')](-0x4))));var theta_V=ee[_0x4e93('0x0')](1e-10);var sin_theta_j=sindSunZe[_0x4e93('0x11')](ee['Image'](1.333));var theta_j=sin_theta_j[_0x4e93('0x25')]()[_0x4e93('0x10')](ee['Image'](0xb4)['divide'](pi));var theta_SZ=SunZe;var R_theta_SZ_s=theta_SZ[_0x4e93('0x10')](pi[_0x4e93('0x11')](ee['Image'](0xb4)))[_0x4e93('0xd')](theta_j['multiply'](pi['divide'](ee['Image'](0xb4))))[_0x4e93('0x15')]()['pow'](0x2)[_0x4e93('0x11')](theta_SZ[_0x4e93('0x10')](pi['divide'](ee[_0x4e93('0x0')](0xb4)))[_0x4e93('0xc')](theta_j[_0x4e93('0x10')](pi[_0x4e93('0x11')](ee['Image'](0xb4))))['sin']()[_0x4e93('0xf')](0x2));var R_theta_V_s=ee[_0x4e93('0x0')](1e-10);var R_theta_SZ_p=theta_SZ[_0x4e93('0x10')](pi[_0x4e93('0x11')](0xb4))[_0x4e93('0xd')](theta_j[_0x4e93('0x10')](pi[_0x4e93('0x11')](0xb4)))[_0x4e93('0x26')]()[_0x4e93('0xf')](0x2)['divide'](theta_SZ[_0x4e93('0x10')](pi['divide'](0xb4))[_0x4e93('0xc')](theta_j[_0x4e93('0x10')](pi[_0x4e93('0x11')](0xb4)))[_0x4e93('0x26')]()[_0x4e93('0xf')](0x2));var R_theta_V_p=ee['Image'](1e-10);var R_theta_SZ=ee[_0x4e93('0x0')](0.5)[_0x4e93('0x10')](R_theta_SZ_s[_0x4e93('0xc')](R_theta_SZ_p));var R_theta_V=ee[_0x4e93('0x0')](0.5)[_0x4e93('0x10')](R_theta_V_s['add'](R_theta_V_p));var theta_neg=cosdSunZe[_0x4e93('0x10')](ee[_0x4e93('0x0')](-0x1))[_0x4e93('0x10')](cosdSatZe)['subtract'](sindSunZe[_0x4e93('0x10')](sindSatZe)[_0x4e93('0x10')](cosdRelAz));var theta_neg_inv=theta_neg[_0x4e93('0x27')]()[_0x4e93('0x10')](ee[_0x4e93('0x0')](0xb4)['divide'](pi));var theta_pos=cosdSunZe[_0x4e93('0x10')](cosdSatZe)[_0x4e93('0xd')](sindSunZe['multiply'](sindSatZe)[_0x4e93('0x10')](cosdRelAz));var theta_pos_inv=theta_pos['acos']()[_0x4e93('0x10')](ee['Image'](0xb4)['divide'](pi));var cosd_tni=theta_neg_inv[_0x4e93('0x10')](pi[_0x4e93('0x11')](0xb4))['cos']();var cosd_tpi=theta_pos_inv[_0x4e93('0x10')](pi[_0x4e93('0x11')](0xb4))[_0x4e93('0xe')]();var Pr_neg=ee[_0x4e93('0x0')](0.75)['multiply'](ee[_0x4e93('0x0')](0x1)[_0x4e93('0xc')](cosd_tni[_0x4e93('0xf')](0x2)));var Pr_pos=ee[_0x4e93('0x0')](0.75)[_0x4e93('0x10')](ee[_0x4e93('0x0')](0x1)['add'](cosd_tpi[_0x4e93('0xf')](0x2)));var Pr=Pr_neg['add'](R_theta_SZ[_0x4e93('0xc')](R_theta_V)[_0x4e93('0x10')](Pr_pos));var denom=ee['Image'](0x4)[_0x4e93('0x10')](pi)[_0x4e93('0x10')](cosdSatZe);var Lr=ESUN[_0x4e93('0x10')](Tr)[_0x4e93('0x10')](Pr[_0x4e93('0x11')](denom));var Lrc=Lt[_0x4e93('0xd')](Lr);var LrcImg=Lrc['arrayProject']([0x0])[_0x4e93('0x22')]([bands]);var prcImg=Lrc[_0x4e93('0x10')](pi)[_0x4e93('0x10')](d[_0x4e93('0xf')](0x2))[_0x4e93('0x11')](ESUN[_0x4e93('0x10')](cosdSunZe));var bands_nm=ee[_0x4e93('0x0')](0x1bb)[_0x4e93('0x23')](ee['Image'](0x1ea))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x230))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x299))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x2c1))[_0x4e93('0x23')](ee['Image'](0x2e4))[_0x4e93('0x23')](ee['Image'](0x30f))[_0x4e93('0x23')](ee['Image'](0x34a))['addBands'](ee[_0x4e93('0x0')](0x361))[_0x4e93('0x23')](ee['Image'](0x0))[_0x4e93('0x23')](ee[_0x4e93('0x0')](0x0))[_0x4e93('0x20')]()[_0x4e93('0x20')](0x1);var Lam_10=LrcImg[_0x4e93('0x2')](_0x4e93('0x28'));var Lam_11=LrcImg['select'](_0x4e93('0x1'));var eps=Lam_11[_0x4e93('0x11')](ESUNImg['select'](_0x4e93('0x1')))['log']()[_0x4e93('0xd')](Lam_10[_0x4e93('0x11')](ESUNImg['select'](_0x4e93('0x28')))[_0x4e93('0x29')]())[_0x4e93('0x11')](ee[_0x4e93('0x0')](0x88e)[_0x4e93('0xd')](ee[_0x4e93('0x0')](0x64a)));var Lam=Lam_11[_0x4e93('0x10')](ESUN[_0x4e93('0x11')](ESUNImg['select'](_0x4e93('0x1'))))[_0x4e93('0x10')](eps['multiply'](ee[_0x4e93('0x0')](-0x1))[_0x4e93('0x10')](bands_nm[_0x4e93('0x11')](ee[_0x4e93('0x0')](0x88e)))[_0x4e93('0x24')]());var trans=Tr['multiply'](ee[_0x4e93('0x0')](-0x1))[_0x4e93('0x11')](ee[_0x4e93('0x0')](0x2))['multiply'](ee[_0x4e93('0x0')](0x1)[_0x4e93('0x11')](cosdSatZe))['exp']();var Lw=Lrc[_0x4e93('0xd')](Lam)[_0x4e93('0x11')](trans);var pw=Lw[_0x4e93('0x10')](pi)[_0x4e93('0x10')](d[_0x4e93('0xf')](0x2))[_0x4e93('0x11')](ESUN[_0x4e93('0x10')](cosdSunZe));var S2_Rrs=pw[_0x4e93('0x11')](pi)[_0x4e93('0x21')]([0x0])['arrayFlatten']([bands])[_0x4e93('0x2a')](0x0,0x9);var ndvi=img[_0x4e93('0x2b')]([_0x4e93('0x2c'),'B4']);S2_Rrs=S2_Rrs[_0x4e93('0x2d')](S2_Rrs[_0x4e93('0x2')]('B1')['gt'](0x0));S2_Rrs=S2_Rrs[_0x4e93('0x2d')](ndvi['lt'](0x0));
        var b11 = img.select('B11');
        return (S2_Rrs
                  .set('system:time_start',img.get('system:time_start'))
                  .set('CLOUDY_PIXEL_PERCENTAGE', img.get('CLOUDY_PIXEL_PERCENTAGE')));
      }
      
      // Define function to mosaic images by date. Necessary for collections with dates that may have multiple tiles present.
      function mosaicDates(images) {
        var reducer = ee.Reducer.mean();
        images = images.map(function(i) {
          return i.set({date:i.date().format('YYYY-MM-dd')}); //set date for all images
        });
        var time = 'date';
        // make list of distinct dates to use in join
        var distinct = images.distinct([time]); 
        // define filter to match images w/ same dates
        var filter = ee.Filter.equals({leftField: time, rightField: time}); 
        // preserve all matches generated from join
        var join = ee.Join.saveAll('matches'); 
        //apply join, creates collection w/ a 'matches' property
        var results = join.apply(distinct, images, filter); 
        //need band names variable to rename bands b/c creating new collection removes names
        var bandNames = ee.Image(images.first()).bandNames(); 
        results = results.map(function(i) {
          //create new image collection for each group of matches
          var mosaic = ee.ImageCollection.fromImages(i.get('matches')) 
                        //sort, reduce collection to single image, rename bands
                        .sort('system:index').reduce(reducer).rename(bandNames); 
          //produces a single image from each group of matches with date reassigned
          return mosaic.copyProperties(i).set(time, i.get(time)) 
            .set('system:time_start', ee.Date(i.get(time)).millis());
        });
        //create a new image collection from all the new daily mosaics
        return ee.ImageCollection(results); 
      }
    //Run mosaicDates function on filtered datasets to mosaic
     
      var mosaickedS2L1 = mosaicDates(S2_Rrs);
    
    
    return [ mosaickedS2L1];
    }
    
    // Run the function that creates the filtered image collection for each of the sensors.
    var filteredCollections = filterbyDateArea(start, end, areaInput);
    
    // Define the individual filtered sensor collections by accessing their index in 'filteredCollections'
    var S2L1_filtColl = filteredCollections[0];

    
    
    // Functions to map onto the image collection ================================
    // Turbidity Algorithms

    var s2_turbidity_alg = function(image) {
          var turbidity = image.expression(
              '(A_t*log(p_w/p_z)+C)', {
                  'p_w': image.select('B3').updateMask(Mask), //red band mid wv_len = 645.5nm
                  'p_z': image.select('B2').updateMask(Mask), //calib param (MAIN)
                  'A_t': 15.31, //calib param (MAIN)
                  'C': 3.497, //calib param (MAIN)
                  'pi': Math.PI,
                  'scale_factor': 1.0 //band info
              }).rename('s2_turb');
          var turb_mask = turbidity.updateMask(turbidity.gte(0));
          return(turb_mask.rename('s2_turb').set('system:time_start', image.get('system:time_start'))
                      .set('CLOUDY_PIXEL_PERCENTAGE', image.get('CLOUDY_PIXEL_PERCENTAGE')));
    };
    // Chlorophyll-a Algorithm
    // Run on Sentinel-2 imagery
    // First, define a function to obtain the Normalized Difference Chlorophyll Index (NDCI) from an image
    var ndci_algorithm = function(image){
          var ndci = image.expression(
            '((B5*sf) - (B4*sf))/((B5*sf) + (B4*sf))', {
              'B4': image.select('B4').updateMask(Mask),
              'B5': image.select('B5').updateMask(Mask),
              'sf': 0.0001
            }).rename('NDCI');
          return(ndci.rename('NDCI').set('system:time_start', image.get('system:time_start'))
                      .set('CLOUDY_PIXEL_PERCENTAGE', image.get('CLOUDY_PIXEL_PERCENTAGE')));
    };
    // Derive the chlorophyll-a concentration using NDCI, adapted from Mishra & Mishra ++++++++++++++++ check on citations
    var mishra_algorithm = function(image){
          var mishra = image.expression(
            'a0 + (a1 * ndci) + (a2 * ndci_sqrd)', {
              'a0': 16.93,
              'a1': 142.2,
              'a2': 182.3,
              'ndci': ndci_algorithm(image).select('NDCI'),
              'ndci_sqrd': ndci_algorithm(image).select('NDCI').pow(2),
            }).rename('s2_chl');
          return(mishra.updateMask(mishra.lte(70)).rename('s2_chl').set('system:time_start', image.get('system:time_start'))
                      .set('CLOUDY_PIXEL_PERCENTAGE', image.get('CLOUDY_PIXEL_PERCENTAGE')));
    };
    
    
 
 
    // Clip the images in each sensor collection to the areaInput
    var S2L1_clipped = S2L1_filtColl.map(function(image){return image.clip(areaInput)});
    
    // Map the water quality algorithms onto their respective sensor image collections
    var S2L1_turb = S2L1_clipped.map(s2_turbidity_alg);
    var S2L1_NDCI = S2L1_clipped.map(ndci_algorithm);
    var S2L1_chla = S2L1_clipped.map(mishra_algorithm);
          //Return image collections
    return [ 
            ee.ImageCollection(S2L1_turb),
            ee.ImageCollection(S2L1_NDCI),
            ee.ImageCollection(S2L1_chla)];
}



/////////////////////////////////////////
//////// Legend Panels /////////////////
////////////////////////////////////////
////___ defines function that makes a color bar given a palette (used to make NDVI and NDWI color bars). Used in the thumbnail params ___/////



// Configure the map.
Map.style().set('cursor', 'crosshair');


////////-------------------------------------panel for point change inspector (AllPanels index 5)-------------------------------////

////checkbox to turn the point change inspector on and off ////
Map.onClick(function(coords) {
  
  var PICollection = createAnalysisIC(start_text.getValue(), end_text.getValue(), areaselect.getValue());
  var chartband;
  var analysis_collection;
  var st;
  if (PIselect.getValue()=='Turbidity / Turbiditet'){chartband = 's2_turb'; analysis_collection = turb_totalMask(PICollection[0]), 's2_turb', st=Stations.filter(ee.Filter.eq("parameter", 'Turbidity / Turbiditet'))}
          else if (PIselect.getValue()=='NDCI'){chartband = 'NDCI'; analysis_collection = ndci_totalMask(PICollection[1]), 'NDCI', st=null}
          else if (PIselect.getValue()=='Chlorophyll-a / Klorofyll-a'){chartband = 's2_chl'; analysis_collection = chl_totalMask(PICollection[2]), 's2_chl',st=Stations.filter(ee.Filter.eq("parameter", 'Chlorophyll-a / Klorofyll-a'))}
           
          
  
  
  var point = ee.Geometry.Point(coords.lon, coords.lat);
  
  var indexChart = ui.Chart.image.seriesByRegion({
          imageCollection: analysis_collection, 
          regions: point,
          reducer: ee.Reducer.mean(),
          scale:30,
          band: chartband,
          seriesProperty: PIselect.getValue()
        });
  ////set the appearance of the chart ////
          indexChart.setOptions({
      title: PIselect.getValue() + " in " + 'selected point' + " Time Series Chart",
      lineWidth: 2,
      pointSize: 5,
      colors: ['#26A69A'],
      interpolateNulls: true,
      hAxis: {
          title: 'Date'
      },
      vAxis: {
          title: PIselect.getValue()
      }})
  ////chart set to PIPanel at index position 6 ////
  PIPanel.widgets().set(4, indexChart);
  var clicked = ui.Map.Layer(point, {color: 'red'}, 'clicked location');

  Map.layers().set(4, clicked);
  if (st == null)
  {
    PIPanel.widgets().set(5, ui.Label('There is no observation for this parameter'));
    
    
  }
  else
  {
    // Join the points to themselves.
    var joined = ee.Join.saveAll({
      matchesKey: 'points', 
      measureKey: 'distance',
      ordering: 'distance'
    }).apply({
      primary: point, 
      secondary: st, 
      condition: spatialFilter
    });
    //print(joined);
    
      // Get distance to nearest point.
    var withNearestDist = joined.map(function(f) {
      var nearestDist = ee.Feature(ee.List(f.get('points')).get(0));
      return nearestDist;
    });
    //print(withNearestDist);
    var near = ui.Map.Layer(withNearestDist, {color: 'blue'}, 'nearest point');
    //Map.addLayer(nearest, {color: 'blue'}, 'Nearest Point');
    
    Map.layers().set(5, near);
    
    var Turbid_station = st.filterBounds(withNearestDist.geometry()).sort("Date")
    
    
    
    
    var ClassChart_Observation =
      ui.Chart.feature
          .byFeature({
            features: Turbid_station,
            xProperty: 'Date',
            yProperties: 'value'
          })
          .setOptions({
            title: PIselect.getValue() + " in " + 'nearest point' + " Time Series Chart",
            interpolateNulls: true,
            hAxis: {title: 'Date'},
            vAxis: {
              title: PIselect.getValue()
            },
            lineWidth: 2,
            pointSize: 5,
          });
    
    PIPanel.widgets().set(5, ClassChart_Observation);
  }
  
  
});

////////////////////////////////////////////
//// FINAL POINT CHANGE INSPECTOR PANEL ////
////////////////////////////////////////////

////menu for selecting what the chart should show ////
var PIselect = ui.Select({
  items: ['Turbidity / Turbiditet', 'NDCI', 'Chlorophyll-a / Klorofyll-a'],
  value: 'Turbidity / Turbiditet' 
});

var PIPanel = ui.Panel({
  widgets: [
    
  /*0*/ui.Label({
    value: AllLabels.PITitle[chosenlanguage],
    style: optionsTitleStyle,
  }),
  /*1*/ui.Label(AllLabels.PIInstr[chosenlanguage]),
  /*2*/ PIselect,
  /*3*/ ui.Panel(),//indexChart added here
  /*4*/ ui.Panel()
  ],
  style: {margin: '10px 0px 0px 0px', border: borderStyle}
});


////-----------------------------------Panel for setting analysis parameters (AllPanels index 6)------------------------------ ////
// Date length and buffer Panel =========================================================
// Define textboxes for user to input desired length and buffer
var length_text = ui.Textbox({
      value: ('500'), // arbitrary length 
      style: {margin:'5px 15px'}
});

var buffer_text = ui.Textbox({
        value: ('100'), // arbitrary buffer 
        style: {margin:'5px 15px'}
});

// Functions to cutline the road to desired length and make a list in drop down
////the actual button: ////
var runbuttonsection = ui.Button({
   label: AllLabels.runbuttonSectionLabel[chosenlanguage],
   style: {width: '300px', color: 'steelblue', padding: '15px 5px 0px 5px'}, //I can't seem to get the button to be bigger!
   onClick: function(){
     var lines = ee.FeatureCollection(
        Road_Analyze.geometry().cutLines(ee.List.sequence(0, Road_Analyze.geometry().length(), parseFloat(length_text.getValue())))
          .geometries()
          .map(function (geometry) { return ee.Feature(ee.Geometry(geometry)); }));
      
      var buffered = lines.map(function (feature) {
        return feature.buffer(parseFloat(buffer_text.getValue()));
      });
      
      var features = buffered.getInfo()['features'];
      var select_items = []
      for (var i = 0; i < features.length; i++) {
        select_items.push({
          label: features[i]['id'],
          value: features[i]['geometry']
        })
      }
      
    
      // Asynchronously get the list of band names.
      
      // Display the bands of the selected image.
      road_section_select.items().reset(select_items);
      
      
    
      
      
      }
      });


var road_section_select = ui.Select({
  onChange: function(value) {
    var road_section = ee.Feature(value)
    var road_section_shape = ui.Map.Layer(road_section, {color: 'green'}, 'Selected Section');
    Map.layers().set(6, road_section_shape);
    var PICollection = createAnalysisIC(start_text.getValue(), end_text.getValue(), areaselect.getValue());
    var chartband;
    var analysis_collection;
    if (PIselect.getValue()=='Turbidity / Turbiditet'){chartband = 's2_turb'; analysis_collection = turb_totalMask(PICollection[1]), 's2_turb'}
            else if (PIselect.getValue()=='NDCI'){chartband = 'NDCI'; analysis_collection = ndci_totalMask(PICollection[2]), 'NDCI'}
            else if (PIselect.getValue()=='Chlorophyll-a / Klorofyll-a'){chartband = 's2_chl'; analysis_collection = chl_totalMask(PICollection[3]), 's2_chl'}
            else if (PIselect.getValue()=='CDOM'){chartband = 's2_cdom'; analysis_collection = cdom_totalMask(PICollection[4]), 's2_cdom'}
            else if (PIselect.getValue()=='Surface Temperature / Overflatetemperatur'){chartband = 'sst'; analysis_collection = PICollection[5], 'sst'}
            else if(PIselect.getValue()==='Precipitation/Nedbør'){chartband = 'precipitation'; analysis_collection = PICollection[6], 'precipitation'}
            
  var indexChart = ui.Chart.image.seriesByRegion({
          imageCollection: analysis_collection, 
          regions: road_section,
          reducer: ee.Reducer.mean(),
          scale:30,
          band: chartband,
          seriesProperty: PIselect.getValue()
        });
  ////set the appearance of the chart ////
          indexChart.setOptions({
      title: PIselect.getValue() + " in " + 'selected point' + " Time Series Chart",
      lineWidth: 2,
      pointSize: 5,
      colors: ['#26A69A'],
      interpolateNulls: true,
      hAxis: {
          title: 'Date'
      },
      vAxis: {
          title: PIselect.getValue()
      }})
  ////chart set to PIPanel at index position 6 ////

  PRPanel.widgets().set(9, indexChart);
  
  }
});
// Final panel that holds the headings and textboxes to input date range for images


////////////////////////////////////////////
//// FINAL ROAD CHANGE INSPECTOR PANEL ////
////////////////////////////////////////////
var PRPanel = ui.Panel({
  widgets: [
    
  /*0*/ui.Label({
    value: AllLabels.PRTitle[chosenlanguage],
    style: optionsTitleStyle,
  }),
  /*1*/ ui.Label(AllLabels.PRInstr[chosenlanguage]),
  /*2*/ ui.Label({value: AllLabels.RoadLengthLabel[chosenlanguage], style: {fontWeight: "bold"} }),
  /*3*/ length_text,
  /*4*/ ui.Label({value: AllLabels.BufferLengthLabel[chosenlanguage], style: {fontWeight: "bold"} }),
  /*5*/ buffer_text,
  /*6*/ runbuttonsection,
  /*7*/ ui.Label({value: AllLabels.SectionSelectedLabel[chosenlanguage], style: {fontWeight: "bold"} }),
  /*8*/ road_section_select,
  /*9*/ ui.Panel(),//indexChart added here
  ],
  style: {margin: '10px 0px 0px 0px', border: borderStyle}
});

////////-------------------------------------------------panel for exporting data (AllPanels index 4)------------------------------------------////
/////////////////////
///// functions /////
/////////////////////

////___ function for exporting images in an image collection ___////
function exportImages(collection_I, band_I, filename_I){ 
  var exportImage;
  if (band_I == 'sst'){
    exportImage = collection_I.select('sst').toBands();
  } else {
    var leastCloudyImg = collection_I.sort('CLOUDY_PIXEL_PERCENTAGE');
    exportImage = leastCloudyImg.select(band_I).toBands()
  }
  

  
  var areaname = ee.String('Catchment').replace(' ', '', 'g').replace('/', '').getInfo(); 
  var areaGeo = setAreaOfInterest(areaselect.getValue());
  Export.image.toDrive({
    image: exportImage,
    description: areaname + "_" + filename_I, //generates the task/file name
    scale: 10, //meters per pixel
    maxPixels: 2e10, 
    region: areaGeo //sets the bounds of the exported image to be the area of interest
  });
}

///////////////////
///// widgets /////
///////////////////

//// menu to select the image type to export ////
var exportselect = ui.Select({
  items: [ 'Turbidity / Turbiditet', 'NDCI', 'Chlorophyll-a / Klorofyll-a'],
  style: {margin: '0px 0px 10px 10px' },
  placeholder: AllLabels.exportselectPlaceholder[chosenlanguage],
  onChange: function(){ExportPanel.widgets().remove(exporterrormsg)},
});

//// error message that appears when clicking the export button without having selected an image type to export ////
var exporterrormsg = ui.Label({value: AllLabels.exporterrormsg[chosenlanguage], style: warningLabelStyle});

////label that appears and provides further instructions once user has clicked export button ////
var exportInstr2 = ui.Label(AllLabels.exportInstr2[chosenlanguage]); 

//// button for exporting images ////
var ICimageExport = ui.Button({
  label: AllLabels.ICimageExportButton[chosenlanguage],
  style: {width: '300px', color: 'steelblue', padding: '15px 5px 0px 5px',},
  onClick: function(){
    if (exportselect.getValue() === null){
      ExportPanel.widgets().set(3, exporterrormsg);
      }
    else{
      var ExportCollections = createAnalysisIC(start_text.getValue(), end_text.getValue(), areaselect.getValue());
      if (exportselect.getValue() == 'True Color / Ekte farge'){exportImages(ExportCollections[7], ['B4', 'B3', 'B2'], "TrueColor")}
      if (exportselect.getValue() == 'Surface Temperature / Overflatetemperatur'){exportImages(ExportCollections[5], 'sst', "SST")}
      if (exportselect.getValue() == 'Turbidity / Turbiditet'){exportImages(ExportCollections[1], 's2_turb', "S2Turb")}
      if (exportselect.getValue() == 'NDCI'){exportImages(ExportCollections[2], 'NDCI', "NDCI")} 
      if (exportselect.getValue() == 'Chlorophyll-a / Klorofyll-a'){exportImages(ExportCollections[3], 's2_chl', "Chla")}
      if (exportselect.getValue() == 'CDOM'){exportImages(ExportCollections[4], 's2_cdom', "CDOM")}
      ExportPanel.widgets().set(5, exportInstr2);
    }
  }, 
});

///////////////////////////////////////////////////////
///// FINAL PANEL FOR EXPORTING IMAGES AND VIDEOS /////
//////////////////////////////////////////////////////
var ExportPanel = ui.Panel({
  widgets: [
    /*0*/ ui.Label({
      value: AllLabels.exportTitle[chosenlanguage],
      style: optionsTitleStyle, 
    }),
    /*1*/ ui.Label(AllLabels.exportInstr1[chosenlanguage]),
    /*2*/ exportselect,
    /*3*/ ui.Panel(), //placeholder for error message
    /*4*/ ICimageExport,
    /*5*/ ui.Panel(), //placeholder for further instructions
    ],
  layout: ui.Panel.Layout.flow('vertical', 'true'),
  style: {margin: '10px 0px 0px 0px', border: borderStyle}
});


//-------------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------------adding all the panels together into one panel------------------------------------//  
//-------------------------------------------------------------------------------------------------------------------------------//
var AllPanels = ui.Panel({
  widgets: [
    /*0*/ LanguageSelectionPanel,
    /*1*/ IntroPanel,
    /*2*/ ParametersPanel, 
    /*3*/ MapDisplayPanel, 
    /*4*/ PIPanel, 
    /*5*/ PRPanel,
    /*6*/ ExportPanel, 
    ],
  style: {width: '350px', padding: '8px'}
});

//insert this panel into the root panel (sidebar)

Map.centerObject(Catchment,11)
Map.addLayer(Catchment,{},'Catchment',true,0.5)
Map.addLayer(Road,{},'Road',true,0.7)
Map.addLayer(water_frequency_masked.clip(Catchment),{min:10,max:100,palette:['orange','yellow','lightblue','darkblue']},'Percentage of annual water occurence');
Map.addLayer(Stations,{},'Stations',true,0.9)
ui.root.insert(0,AllPanels);
