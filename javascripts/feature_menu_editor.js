/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the BSD license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/ClickableFeatures.js
 * @requires widgets/FeatureEditPopup.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = FeatureMenuEditor
 */

/** api: (extends)
 *  plugins/ClickableFeatures.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: FeatureMenuEditor(config)
 *
 *    Plugin for feature editing. Requires a
 *    :class:`gxp.plugins.FeatureManager`.
 */   
gxp.plugins.FeatureMenuEditor = Ext.extend(gxp.plugins.FeatureEditor, {
    
    /** api: ptype = gxp_featureeditor */
    ptype: "gxp_featuremenueditor",

    /** api: config[menuText]
     *  ``String``
     *  Menu title.
     */
    menuText: "Feature manager",

    iconShowFeatureManagerTool: 'gxp-icon-addfeature',

    createFeatureActionText: '',

    editFeatureActionText: '',

    toolWinText: 'Tools',

    /** api: method[addActions]
     */
    addActions: function() {
        var popup;
        var featureManager = this.getFeatureManager();
        var featureLayer = featureManager.featureLayer;
        
        // optionally set up snapping
        var snapId = this.snappingAgent;
        if (snapId) {
            var snappingAgent = this.target.tools[snapId];
            if (snappingAgent) {
                snappingAgent.addSnappingControl(featureLayer);
            } else {
                throw new Error("Unable to locate snapping agent: " + snapId);
            }
        }

        var intercepting = false;
        // intercept calls to methods that change the feature store - allows us
        // to persist unsaved changes before calling the original function
        function intercept(mgr, fn) {
            var fnArgs = Array.prototype.slice.call(arguments);
            // remove mgr and fn, which will leave us with the original
            // arguments of the intercepted loadFeatures or setLayer function
            fnArgs.splice(0, 2);
            if (!intercepting && popup && !popup.isDestroyed) {
                if (popup.editing) {
                    function doIt() {
                        intercepting = true;
                        unregisterDoIt.call(this);
                        if (fn === "setLayer") {
                            this.target.selectLayer(fnArgs[0]);
                        } else if (fn === "clearFeatures") {
                            // nothing asynchronous involved here, so let's
                            // finish the caller first before we do anything.
                            window.setTimeout(function() {mgr[fn].call(mgr);});
                        } else {
                            mgr[fn].apply(mgr, fnArgs);
                        }
                    }
                    function unregisterDoIt() {
                        featureManager.featureStore.un("write", doIt, this);
                        popup.un("canceledit", doIt, this);
                        popup.un("cancelclose", unregisterDoIt, this);
                    }
                    featureManager.featureStore.on("write", doIt, this);
                    popup.on({
                        canceledit: doIt,
                        cancelclose: unregisterDoIt,
                        scope: this
                    });
                    popup.close();
                }
                return !popup.editing;
            }
            intercepting = false;
        }
        featureManager.on({
            "beforequery": intercept.createDelegate(this, "loadFeatures", 1),
            "beforelayerchange": intercept.createDelegate(this, "setLayer", 1),
            "beforesetpage": intercept.createDelegate(this, "setPage", 1),
            "beforeclearfeatures": intercept.createDelegate(this, "clearFeatures", 1),
            scope: this
        });
        
        this.drawControl = new OpenLayers.Control.DrawFeature(
            featureLayer,
            OpenLayers.Handler.Point, 
            {
                eventListeners: {
                    featureadded: function(evt) {
                        if (this.autoLoadFeature === true) {
                            this.autoLoadedFeature = evt.feature;
                        }
                    },
                    activate: function() {
                        featureManager.showLayer(
                            this.id, this.showSelectedOnly && "selected"
                        );
                    },
                    deactivate: function() {
                        featureManager.hideLayer(this.id);
                    },
                    scope: this
                }
            }
        );
        
        // create a SelectFeature control
        // "fakeKey" will be ignord by the SelectFeature control, so only one
        // feature can be selected by clicking on the map, but allow for
        // multiple selection in the featureGrid
        this.selectControl = new OpenLayers.Control.SelectFeature(featureLayer, {
            clickout: false,
            multipleKey: "fakeKey",
            unselect: function() {
                // TODO consider a beforefeatureunselected event for
                // OpenLayers.Layer.Vector
                if (!featureManager.featureStore.getModifiedRecords().length) {
                    OpenLayers.Control.SelectFeature.prototype.unselect.apply(this, arguments);
                }
            },
            eventListeners: {
                "activate": function() {
                    if (this.autoLoadFeature === true || featureManager.paging) {
                        this.target.mapPanel.map.events.register(
                            "click", this, this.noFeatureClick
                        );
                    }
                    featureManager.showLayer(
                        this.id, this.showSelectedOnly && "selected"
                    );
                    this.selectControl.unselectAll(
                        popup && popup.editing && {except: popup.feature}
                    );
                },
                "deactivate": function() {
                    if (this.autoLoadFeature === true || featureManager.paging) {
                        this.target.mapPanel.map.events.unregister(
                            "click", this, this.noFeatureClick
                        );
                    }
                    if (popup) {
                        if (popup.editing) {
                            popup.on("cancelclose", function() {
                                this.selectControl.activate();
                            }, this, {single: true});
                        }
                        popup.on("close", function() {
                            featureManager.hideLayer(this.id);
                        }, this, {single: true});
                        popup.close();
                    } else {
                        featureManager.hideLayer(this.id);
                    }
                },
                scope: this
            }
        });
        
        featureLayer.events.on({
            "beforefeatureremoved": function(evt) {
                this.selectControl.unselect(evt.feature);
            },
            "featureunselected": function(evt) {
                if(popup) {
                    popup.close();
                }
            },
            "beforefeatureselected": function(evt) {
                //TODO decide if we want to allow feature selection while a
                // feature is being edited. If so, we have to revisit the
                // SelectFeature/ModifyFeature setup, because that would
                // require to have the SelectFeature control *always*
                // activated *after* the ModifyFeature control. Otherwise. we
                // must not configure the ModifyFeature control in standalone
                // mode, and use the SelectFeature control that comes with the
                // ModifyFeature control instead.
                if(popup) {
                    return !popup.editing;
                }
            },
            "featureselected": function(evt) {
                var feature = evt.feature;
                var featureStore = featureManager.featureStore;
                if(this.selectControl.active && feature.geometry !== null) {
                    popup = this.addOutput({
                        xtype: "gxp_featureeditpopup",
                        collapsible: true,
                        feature: feature,
                        vertexRenderIntent: "vertex",
                        readOnly: this.readOnly,
                        fields: this.fields,
                        excludeFields: this.excludeFields,
                        editing: feature.state === OpenLayers.State.INSERT,
                        schema: this.schema,
                        allowDelete: true,
                        width: 200,
                        height: 250,
                        listeners: {
                            "close": function() {
                                if(feature.layer && feature.layer.selectedFeatures.indexOf(feature) !== -1) {
                                    this.selectControl.unselect(feature);
                                }
                                if (feature === this.autoLoadedFeature) {
                                    featureStore.remove(featureStore.getRecordFromFeature(feature));
                                }
                            },
                            "featuremodified": function(popup, feature) {
                                popup.disable();
                                featureStore.on({
                                    write: {
                                        fn: function() {
                                            if (popup && popup.isVisible()) {
                                                popup.enable();
                                            }
                                        },
                                        single: true
                                    },
                                    exception: {
                                        fn: function(proxy, type, action, options, response, records) {
                                            var msg = this.exceptionText;
                                            if (type === "remote") {
                                                // response is service exception
                                                if (response.exceptionReport) {
                                                    msg = gxp.util.getOGCExceptionText(response.exceptionReport);
                                                }
                                            } else {
                                                // non-200 response from server
                                                msg = "Status: " + response.status;
                                            }
                                            // fire an event on the feature manager
                                            featureManager.fireEvent("exception", featureManager, 
                                                response.exceptionReport || {}, msg, records);
                                            Ext.Msg.show({
                                                title: this.exceptionTitle,
                                                msg: msg,
                                                icon: Ext.MessageBox.ERROR,
                                                buttons: {ok: true}
                                            });
                                            if (popup && popup.isVisible()) {
                                                popup.enable();
                                                popup.startEditing();
                                            }
                                        },
                                        single: true
                                    },
                                    scope: this
                                });                                
                                if(feature.state === OpenLayers.State.DELETE) {                                    
                                    /**
                                     * If the feature state is delete, we need to
                                     * remove it from the store (so it is collected
                                     * in the store.removed list.  However, it should
                                     * not be removed from the layer.  Until
                                     * http://trac.geoext.org/ticket/141 is addressed
                                     * we need to stop the store from removing the
                                     * feature from the layer.
                                     */
                                    featureStore._removing = true; // TODO: remove after http://trac.geoext.org/ticket/141
                                    featureStore.remove(featureStore.getRecordFromFeature(feature));
                                    delete featureStore._removing; // TODO: remove after http://trac.geoext.org/ticket/141
                                }
                                featureStore.save();
                            },
                            "canceledit": function(popup, feature) {
                                featureStore.commitChanges();
                            },
                            scope: this
                        }
                    });
                    this.popup = popup;
                }
            },
            "sketchcomplete": function(evt) {
                // Why not register for featuresadded directly? We only want
                // to handle features here that were just added by a
                // DrawFeature control, and we need to make sure that our
                // featuresadded handler is executed after any FeatureStore's,
                // because otherwise our selectControl.select statement inside
                // this handler would trigger a featureselected event before
                // the feature row is added to a FeatureGrid. This, again,
                // would result in the new feature not being shown as selected
                // in the grid.
                featureManager.featureLayer.events.register("featuresadded", this, function(evt) {
                    featureManager.featureLayer.events.unregister("featuresadded", this, arguments.callee);
                    this.drawControl.deactivate();
                    this.selectControl.activate();
                    this.selectControl.select(evt.features[0])
                })
            },
            scope: this
        });

        var toggleGroup = this.toggleGroup || Ext.id();

        featureManager.on("layerchange", this.onLayerChange, this);

        var winActions = [
          new Ext.Button(new GeoExt.Action({
            id:'createFeature',
            //flex: 1,
            tooltip: this.createFeatureActionTip,
            text: this.createFeatureActionText,
            iconCls: this.iconClsAdd,
            disabled: true,
            hidden: this.modifyOnly || this.readOnly,
            toggleGroup: toggleGroup,
            enableToggle: true,
            allowDepress: true,
            control: this.drawControl,
            deactivateOnDisable: true,
            map: this.target.mapPanel.map
          })),
          new Ext.Button(new GeoExt.Action({
            id:'editFeature',
            //flex: 1,
            tooltip: this.editFeatureActionTip,
            text: this.editFeatureActionText,
            iconCls: this.iconClsEdit,
            disabled: true,
            toggleGroup: toggleGroup,
            enableToggle: true,
            allowDepress: true,
            control: this.selectControl,
            deactivateOnDisable: true,
            map: this.target.mapPanel.map
          }))
        ]

        var win = new Ext.Window({
          title: this.toolWinText,
          closable:true,
          width:100,
          height:58,
          //border:false,
          plain:true,
          //layout: 'border',
          layout: {
              type: 'hbox',
              pack: 'start'
          },
          items: winActions,
          closeAction:'hide'
        })
        

        action = {
          text: this.textFeatureManagerTool
          ,iconCls: this.iconShowFeatureManagerTool
          ,handler: function(e){
            var box = Ext.fly(e.container.dom).getBox()
            ,x = box.x
            ,y = box.y + box.height
            if(x + win.width > window.innerWidth) x = window.innerWidth - win.width
            win.setPosition(x,y)
            win.show()
          }
        }

        this.winActions = winActions

        return gxp.plugins.Tool.prototype.addActions.apply(this, [action])

    },

    /** private: method[onLayerChange]
     *  :arg mgr: :class:`gxp.plugins.FeatureManager`
     *  :arg layer: ``GeoExt.data.LayerRecord``
     *  :arg schema: ``GeoExt.data.AttributeStore``
     */
    onLayerChange: function(mgr, layer, schema) {
        this.schema = schema;
        var disable = !schema || !this.target.isAuthorized();
        //this.actions[0].items[0].menu.items.get('createFeature').setDisabled(disable)
        //this.actions[0].items[0].menu.items.get('editFeature').setDisabled(disable)
        this.winActions[0].setDisabled(disable)
        this.winActions[1].setDisabled(disable)
        if (disable) {
            // not a wfs capable layer or not authorized
            return;
        }

        var control = this.drawControl;
        var button = this.winActions[0]
        var handlers = {
            "Point": OpenLayers.Handler.Point,
            "Line": OpenLayers.Handler.Path,
            "Curve": OpenLayers.Handler.Path,
            "Polygon": OpenLayers.Handler.Polygon,
            "Surface": OpenLayers.Handler.Polygon
        }
        var simpleType = mgr.geometryType.replace("Multi", "");
        var Handler = handlers[simpleType];
        if (Handler) {
            var active = control.active;
            if(active) {
                control.deactivate();
            }
            control.handler = new Handler(
                control, control.callbacks,
                Ext.apply(control.handlerOptions, {multi: (simpleType != mgr.geometryType)})
            );
            if(active) {
                control.activate();
            }
            button.enable();
        } else {
            button.disable();
        }
    }

});

Ext.preg(gxp.plugins.FeatureMenuEditor.prototype.ptype, gxp.plugins.FeatureMenuEditor);
