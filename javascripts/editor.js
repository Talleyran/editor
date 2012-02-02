/**
* Copyright (c)
*
*/

/**
* @requires plugins/Tool.js
*/

/** api: (define)
* module = gxp.plugins
* class = Editor
*/

/** api: (extends)
* plugins/Tool.js
*/
Ext.namespace("gxp.plugins");

/** api: constructor
* .. class:: Editor(config)
*
* Provides two actions for zooming back and forth.
*/
gxp.plugins.Editor = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_editor */
    ptype: "gxp_editor",
    
    /** api: config[tooltip]
    * ``String``
    * Text for zoom previous action tooltip (i18n).
    */
    tooltip: "Pricker",

    /** api: config[tooltip]
    * ``String``
    * Text for zoom previous action tooltip (i18n).
    */
    menuText: "Pricker",

    createText: "Manager",

    editText: "Editor",

    deleteText: "Pricker",

    /** api: config[chartOptions]
     *  ``Object``
     *  Attributes for ``PrickerWindow`` intialization
     *  layer.
     */
    chartOptions: {},

    /** api: config[format]
     *  ``String``
     *  parameter for GetFeatureInfo request
     */
    format: 'text/plain',

    /** api: config[buffer]
     *  ``Integer``
     *  parameter for GetFeatureInfo request
     */
    buffer: 3,

    /** api: config[layers]
     *  ``Array``
     *  ``OpenLayers.layer`` used for GetFeatureInfo request
     */
    layers: [],

    /** api: config[layersStoreData]
     *  ``Ext4.Store``
     */
    layersStoreData: [],

    /** api: config[getInfoUrl]
     *  ``String``
     *  Path for for GetFeatureInfo request
     */
    getInfoUrl: '/',

    /** api: config[saveChartUrl]
     *  ``String``
     *  Path for for saving chart's parametrs
     */
    saveChartUrl: '/',

    /** api: config[aliaseUrl]
     *  ``String``
     *  Path for for aliaseUrl request
     */
    aliaseUrl: '/',

    /** api: config[nameTitleAlias]
     *  Title for field with layers name.
     */
    nameTitleAlias: 'name',

    /** api: method[addActions]
    */
    addActions: function() {
        var pricker = new GeoExt.Pricker({
             format: this.format
             ,buffer: this.buffer
             ,layers: this.layers
             ,layersStoreData: this.layersStoreData
             ,getInfoUrl: this.getInfoUrl
             ,saveChartUrl: this.saveChartUrl
             ,aliaseUrl: this.aliaseUrl
             ,nameTitleAlias: this.nameTitleAlias
             ,chartOptions: this.chartOptions
        })
        this.target.mapPanel.map.addControl(pricker)


        var fm = new gxp.plugins.FeatureManager()
        fm.init(this.target)

        //var fe = new gxp.plugins.FeatureEditor()
        //fe.featureManager = fm
        //fe.init(this.target)
        //fe.addActions()

        var actions = [
          {                   // <-- Add the action directly to a toolbar
            text: this.menuText,
            menu: [
              {
                  text: this.createText,
                  handler: function(){
                    console.log(fm.activate())
                  }
              }, 
              {
                  text: this.editText,
                  iconClsEdit: "gxp-icon-editfeature",
                  handler: function(){
                    console.log(fe.activate())
                  }
              }
            ]
          },
        ];
        return gxp.plugins.Editor.superclass.addActions.apply(this, [actions]);
    }

});

Ext.preg(gxp.plugins.Editor.prototype.ptype, gxp.plugins.Editor);
