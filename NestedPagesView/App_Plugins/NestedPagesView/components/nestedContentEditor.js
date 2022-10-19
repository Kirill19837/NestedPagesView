angular.module('umbraco').component('nestedContentEditor', {
    templateUrl: Umbraco.Sys.ServerVariables.application.applicationPath + "App_Plugins/NestedPagesView/views/nestedContentEditor.html",
    controller: NestedContentController,
    controllerAs: 'vm',
    require: {
        umbProperty: '?^umbProperty',
        umbVariantContent: '?^^umbVariantContent'
    }
});

function NestedContentController($scope, $interpolate, $filter, appState, editorState, contentResource, localizationService, iconHelper, eventsService, navigationService) {
    var vm = this;
    var model = $scope.$parent.viewmodel;
    var contentTypeAliases = [];
    _.each(model.config.contentTypes, function (contentType) {
        contentTypeAliases.push(contentType.ncAlias);
    });
    _.each(model.config.contentTypes, function (contentType) {
        contentType.nameExp = !!contentType.nameTemplate ? $interpolate(contentType.nameTemplate) : undefined;
    });
    vm.isChanged = false;
    vm.nodes = [];
    vm.currentNodes = [];
    vm.scaffolds = null;
    vm.sorting = false;
    vm.inited = false;
    vm.minItems = model.config.minItems || 0;
    vm.maxItems = model.config.maxItems || 0;
    if (vm.maxItems === 0)
        vm.maxItems = 1000;
    vm.singleMode = vm.minItems === 1 && vm.maxItems === 1 && model.config.contentTypes.length === 1;

    vm.showIcons = Object.toBoolean(model.config.showIcons);
    vm.wideMode = Object.toBoolean(model.config.hideLabel);
    vm.hasContentTypes = model.config.contentTypes.length > 0;
    var labels = {};
    vm.labels = labels;
    localizationService.localizeMany([
        'grid_addElement',
        'content_createEmpty',
        'actions_copy'
    ]).then(function (data) {
        labels.grid_addElement = data[0];
        labels.content_createEmpty = data[1];
        labels.copy_icon_title = data[2];
    });

    function setCurrentNode(node) {
        updateModel();
        var index = vm.currentNodes.findIndex(x => x.key === node.key)
        if (index == -1) {
            vm.currentNodes.push(node)
        } else {
            vm.currentNodes.splice(index, 1);
        }
    }
    vm.containsNode = (node) => {
        var index = vm.currentNodes.findIndex(x => x.key === node.key)
        return index !== -1;
    }
    vm.setCurrentNode = setCurrentNode;
    vm.getName = function (idx) {
        if (!model.value || !model.value.length) {
            return '';
        }
        var name = '';
        if (model.value[idx]) {
            var contentType = getContentTypeConfig(model.value[idx].ncContentTypeAlias);
            if (contentType != null) {
                // first try getting a name using the configured label template
                if (contentType.nameExp) {
                    // Run the expression against the stored dictionary value, NOT the node object
                    var item = model.value[idx];
                    // Add a temporary index property
                    item['$index'] = idx + 1;
                    var newName = contentType.nameExp(item);
                    if (newName && (newName = $.trim(newName))) {
                        name = newName;
                    }
                    // Delete the index property as we don't want to persist it
                    delete item['$index'];
                }
                // if we still do not have a name and we have multiple content types to choose from, use the content type name (same as is shown in the content type picker)
                if (!name && vm.scaffolds.length > 1) {
                    var scaffold = getScaffold(contentType.ncAlias);
                    if (scaffold) {
                        name = scaffold.contentTypeName;
                    }
                }
            }
        }
        if (!name) {
            name = 'Item ' + (idx + 1);
        }
        // Update the nodes actual name value
        if (vm.nodes[idx].name !== name) {
            vm.nodes[idx].name = name;
        }
        return name;
    };
    vm.getIcon = function (idx) {
        if (!model.value || !model.value.length) {
            return '';
        }
        var scaffold = getScaffold(model.value[idx].ncContentTypeAlias);
        return scaffold && scaffold.icon ? iconHelper.convertFromLegacyIcon(scaffold.icon) : 'icon-folder';
    };

    function getScaffold(alias) {
        return _.find(vm.scaffolds, function (scaffold) {
            return scaffold.contentTypeAlias === alias;
        });
    }
    function getContentTypeConfig(alias) {
        return _.find(model.config.contentTypes, function (contentType) {
            return contentType.ncAlias === alias;
        });
    }

    var notSupported = [
        'Umbraco.Tags',
        'Umbraco.UploadField',
        'Umbraco.ImageCropper'
    ];
    // Initialize
    var scaffoldsLoaded = 0;
    vm.scaffolds = [];
    _.each(model.config.contentTypes, function (contentType) {
        contentResource.getScaffold(-20, contentType.ncAlias).then(function (scaffold) {
            transformNode(scaffold, contentType)
            // Store the scaffold object
            vm.scaffolds.push(scaffold);

            scaffoldsLoaded++;
            initIfAllScaffoldsHaveLoaded();
        }, function (error) {
            scaffoldsLoaded++;
            initIfAllScaffoldsHaveLoaded();
        });
    });
    var initIfAllScaffoldsHaveLoaded = function initIfAllScaffoldsHaveLoaded() {
        // Initialize when all scaffolds have loaded
        if (model.config.contentTypes.length === scaffoldsLoaded) {
            // Because we're loading the scaffolds async one at a time, we need to
            // sort them explicitly according to the sort order defined by the data type.
            contentTypeAliases = [];
            _.each(model.config.contentTypes, function (contentType) {
                contentTypeAliases.push(contentType.ncAlias);
            });
            vm.scaffolds = $filter('orderBy')(vm.scaffolds, function (s) {
                return contentTypeAliases.indexOf(s.contentTypeAlias);
            });
            // Convert stored nodes
            if (model.value) {
                for (var i = 0; i < model.value.length; i++) {
                    var item = model.value[i];
                    var scaffold = getScaffold(item.ncContentTypeAlias);
                    if (scaffold == null) {
                        // No such scaffold - the content type might have been deleted. We need to skip it.
                        continue;
                    }
                    createNode(scaffold, item);
                }
            }
            // Enforce min items if we only have one scaffold type
            var modelWasChanged = false;
            if (vm.nodes.length < vm.minItems && vm.scaffolds.length === 1) {
                for (var i = vm.nodes.length; i < model.config.minItems; i++) {
                    //addNode(vm.scaffolds[0].contentTypeAlias);
                }
                modelWasChanged = true;
            }
            // If there is only one item, set it as current node
            if (vm.singleMode || vm.nodes.length === 1 && vm.maxItems === 1) {
                setCurrentNode(vm.nodes[0]);
            }
            vm.inited = true;
            if (modelWasChanged) {
                updateModel();
            }
        }
    };
    function createNode(scaffold, fromNcEntry) {
        var node = angular.copy(scaffold);
        node.key = fromNcEntry && fromNcEntry.key ? fromNcEntry.key : String.CreateGuid();
        node.id = node.key;
        node.parentId = model.config.parentId;
        node.published = fromNcEntry.published;
        var variant = node.currentVariant;
        for (var t = 0; t < variant.tabs.length; t++) {
            var tab = variant.tabs[t];
            for (var p = 0; p < tab.properties.length; p++) {
                var prop = tab.properties[p];
                prop.propertyAlias = prop.alias;
                prop.alias = model.alias + '___' + prop.alias;
                // Force validation to occur server side as this is the
                // only way we can have consistency between mandatory and
                // regex validation messages. Not ideal, but it works.
                prop.ncMandatory = prop.validation.mandatory;
                prop.validation = {
                    mandatory: false,
                    pattern: ''
                };
                if (fromNcEntry && fromNcEntry[prop.propertyAlias]) {
                    prop.value = fromNcEntry[prop.propertyAlias];
                }

            }
        }
        vm.nodes.push(node);
        return node;
    }
    function convertNodeIntoNCEntry(node) {
        var obj = {
            key: node.key,
            name: node.name,
            ncContentTypeAlias: node.contentTypeAlias
        };
        for (var t = 0; t < node.currentVariant.tabs.length; t++) {
            var tab = node.currentVariant.tabs[t];
            for (var p = 0; p < tab.properties.length; p++) {
                var prop = tab.properties[p];
                if (typeof prop.value !== 'function') {
                    obj[prop.propertyAlias] = prop.value;
                }
            }
        }
        return obj;
    }
    function syncCurrentNode() {
        vm.currentNodes.forEach(x => $scope.$broadcast('ncSyncVal', { key: x.key }))
    }

    function updateModel() {
        vm.isChanged = true;
        syncCurrentNode();
        if (vm.inited) {
            var newValues = [];
            for (var i = 0; i < vm.nodes.length; i++) {
                newValues.push(convertNodeIntoNCEntry(vm.nodes[i]));
            }
            model.value = newValues;
        }
    }

    var unsubscribe = $scope.$on('formSubmitting', function (ev, args) {
        updateModel();
    });

    var unsubscribeContentSaved = eventsService.on("content.saved", function (event, args) {
        vm.saveChanges();
    })

    $scope.$on('$destroy', function () {
        unsubscribe();
        unsubscribeContentSaved();
    });


    vm.saveChanges = function saveChanges() {
        updateModel();
        var basePromise = model.value.reduce((promise, x) => {
            var node = vm.nodes.find(y => y.key == x.key);
            node.currentVariant.publish = node.published;
            return promise.then(() => save(node, node.published ? contentResource.publish : contentResource.save));
        }, Promise.resolve());

        basePromise.finally(reloadContentTree);
    };

    vm.publish = function publish(node) {
        updateModel();
        node.isChanged = true;

        node.currentVariant.publish = true;
        save(node, contentResource.publish).then(() => {
            node.published = true;
            reloadContentTree();
        });
    }
    vm.unpublish = function unpublish(node) {
        updateModel();
        node.isChanged = true;

        save(node, contentResource.save).then(() => {
            return contentResource.unpublish(node.id, [node.currentVariant.language.culture]).then(() => {
                node.published = false;
                reloadContentTree();
            });
        });
    }

    function reloadContentTree() {
        var path = angular.copy(editorState.current.path);
        path = `${path}, ${model.config.parentId}`;

        return navigationService.syncTree({
            tree: "content",
            path: path,
            forceReload: true,
            activate: false
        }).finally(() => {
            var activeNode = appState.getTreeState("selectedNode");
            if (activeNode) {
                navigationService.reloadNode(activeNode);
            }
        });
    }

    function save(content, action) {
        var node = angular.copy(content);

        if (!node.isChanged) {
            console.log("Not changed");
            return;
        }

        var nameProp = node.currentVariant.tabs[0].properties.shift();
        node.currentVariant.name = nameProp.value;

        var prefix = model.alias + '___';
        node.variants.forEach(variant => {
            variant.tabs[0].properties.forEach(property => {
                if (property.alias.startsWith(prefix)) {
                    property.alias = property.alias.slice(prefix.length);
                }
            })
        });

        return action(node, false, []);
    }

    function transformNode(node, contentType) {
        node.currentVariant = node.variants.find(x => x.language.culture == model.config.culture);
        node.currentVariant["publish"] = true;
        node.currentVariant["save"] = true;

        var tabs = node.currentVariant.tabs;
        var tab = _.find(tabs, function (tab) {
            return tab.id !== 0 && (tab.alias.toLowerCase() === contentType.ncTabAlias.toLowerCase() || contentType.ncTabAlias === '');
        });
        node.currentVariant.tabs = [];
        if (tab) {
            node.currentVariant.tabs.push(tab);
            angular.forEach(tab.properties, function (property) {
                if (_.find(notSupported, function (x) {
                    return x === property.editor;
                })) {
                    property.notSupported = true;
                    // TODO: Not supported message to be replaced with 'content_nestedContentEditorNotSupported' dictionary key. Currently not possible due to async/timing quirk.
                    property.notSupportedMessage = 'Property ' + property.label + ' uses editor ' + property.editor + ' which is not supported by Nested Content.';
                }
            });

            var name = "";
            var isNamePropertyExists = tab.properties[0].alias === "name" || tab.properties[0].propertyAlias === "name";
            if (isNamePropertyExists) {
                var prop = tab.properties.shift();
                name = prop.value;
            }

            tab.properties.unshift({
                label: "Page name",
                view: "textbox",
                config: {
                    "maxChars": null
                },
                "hideLabel": false,
                "labelOnTop": false,
                "validation": {
                    "mandatory": false,
                    "pattern": ""
                },
                "readonly": false,
                "id": 0,
                "dataTypeKey": "00000000-0000-0000-0000-00000000000",
                "value": name,
                "alias": "name",
                "editor": "Umbraco.TextBox",
                "isSensitive": false,
                "culture": model.config.culture,
                "segment": null,
                "propertyAlias": "name",
                "ncMandatory": false,
            })

        }
    }
}