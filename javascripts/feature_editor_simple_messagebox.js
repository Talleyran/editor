/**
 * Copyright (c) 2008-2012 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = FeatureEditorSimpleMessagebox
 *  base_link = `Ext.grid.PropertyGrid <http://extjs.com/deploy/dev/docs/?class=Ext.grid.PropertyGrid>`_
 */

Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: FeatureEditorSimpleMessagebox(config)
 *
 *    Plugin for editing a feature in a property grid.
 */
gxp.plugins.FeatureEditorSimpleMessagebox = Ext.extend(Ext.form.TextArea, {

    /** api: ptype = gxp_editormessagebox */
    ptype: "gxp_editormessagebox",

    /** api: config[feature]
     *  ``OpenLayers.Feature.Vector`` The feature being edited/displayed.
     */
    feature: null,

    bodyAttribute: null,

    usernameAttribute: null,

    username: null,

    /** api: config[schema]
     *  ``GeoExt.data.AttributeStore`` Optional. If provided, available
     *  feature attributes will be determined from the schema instead of using
     *  the attributes that the feature has currently set.
     */
    schema: null,

    /** api: config[fields]
     *  ``Array``
     *  List of field config names corresponding to feature attributes.  If
     *  not provided, fields will be derived from attributes. If provided,
     *  the field order from this list will be used, and fields missing in the
     *  list will be excluded.
     */
    fields: null,

    /** api: config[excludeFields]
     *  ``Array`` Optional list of field names (case sensitive) that are to be
     *  excluded from the editor plugin.
     */
    excludeFields: null,

    /** api: config[propertyNames]
     *  ``Object`` Property name/display name pairs. If specified, the display
     *  name will be shown in the name column instead of the property name.
     */
    propertyNames: null,

    /** api: config[readOnly]
     *  ``Boolean`` Set to true to disable editing. Default is false.
     */
    readOnly: null,

    /** private: property[border]
     *  ``Boolean`` Do not show a border.
     */
    border: false,

    autoScroll: true,

    /** private: method[initComponent]
     */
    initComponent : function() {
        gxp.plugins.FeatureEditorSimpleMessagebox.superclass.initComponent.apply(this, arguments);
        this.setReadOnly(true)
        var bodyAttribute = 'body',
            usernameAttribute = 'username'
        if( this.bodyAttribute ) bodyAttribute = this.bodyAttribute
        if( this.usernameAttribute ) usernameAttribute = this.usernameAttribute
        this.setValue(this.feature.attributes[bodyAttribute])
        this.on('change', function(e){ 
          this.feature.attributes[bodyAttribute] = this.getValue() 
          this.feature.attributes[usernameAttribute] = this.username 
          this.featureEditor.setFeatureState(this.featureEditor.getDirtyState());
        })
    },

    /** private: method[init]
     *
     *  :arg target: ``gxp.FeatureEditPopup`` The feature edit popup 
     *  initializing this plugin.
     */
    init: function(target) {
        this.featureEditor = target;
        this.featureEditor.on("canceledit", this.onCancelEdit, this);
        this.featureEditor.add(this);
        this.featureEditor.doLayout();
        this.featureEditor.on('startedit',this.onStartEdit,this)
        this.featureEditor.on('stopedit',this.onStopEdit,this)
    },

    /** private: method[destroy]
     *  Clean up.
     */
    destroy: function() {
        this.featureEditor.un("canceledit", this.onCancelEdit, this);
        this.featureEditor.un("startedit", this.onStartEdit, this);
        this.featureEditor.un("stopedit", this.onStopEdit, this);
        this.featureEditor = null;
        gxp.plugins.FeatureEditorSimpleMessagebox.superclass.destroy.call(this);
    },

    /** private: method[onCancelEdit]
     *  :arg panel: ``gxp.FeatureEditPopup``
     *  :arg feature: ``OpenLayers.Feature.Vector``
     *
     *  When editing is cancelled, set the source of this property grid
     *  back to the supplied feature.
     */
    onCancelEdit: function(panel, feature) {
        if (feature) {
            this.setSource(feature.attributes);
        }
    },

    onStartEdit: function(){this.setReadOnly(false)},

    onStopEdit: function(){this.setReadOnly(true)}

});

Ext.preg(gxp.plugins.FeatureEditorSimpleMessagebox.prototype.ptype, gxp.plugins.FeatureEditorSimpleMessagebox);
