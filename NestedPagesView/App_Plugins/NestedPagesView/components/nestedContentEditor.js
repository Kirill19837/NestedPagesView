angular.module('umbraco').component('nestedContentEditor', {
    templateUrl: Umbraco.Sys.ServerVariables.application.applicationPath + "App_Plugins/NestedPagesView/views/nestedContentEditor.html",
    controller: NestedContentController,
    controllerAs: 'vm',
    require: {
        umbProperty: '?^umbProperty',
        umbVariantContent: '?^^umbVariantContent'
    }
});

function NestedContentController($scope, $interpolate, $filter, appState, editorState, contentResource, localizationService, iconHelper, clipboardService, eventsService, overlayService, navigationService) {
    var vm = this;
    var model = $scope.$parent.model;
    var contentTypeAliases = [];
    _.each(model.config.contentTypes, function (contentType) {
        contentTypeAliases.push(contentType.ncAlias);
    });
    _.each(model.config.contentTypes, function (contentType) {
        contentType.nameExp = !!contentType.nameTemplate ? $interpolate(contentType.nameTemplate) : undefined;
    });
    vm.isChanged = false;
    vm.nodes = [];
    vm.deletedNodes = [];
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

    var copyAllEntries = function copyAllEntries() {
        syncCurrentNode();
        // list aliases
        var aliases = vm.nodes.map(function (node) {
            return node.contentTypeAlias;
        });
        // remove dublicates
        aliases = aliases.filter(function (item, index) {
            return aliases.indexOf(item) === index;
        });
        var nodeName = '';
        if (vm.umbVariantContent) {
            nodeName = vm.umbVariantContent.editor.content.name;
        }
        localizationService.localize('clipboard_labelForArrayOfItemsFrom', [
            model.label,
            nodeName
        ]).then(function (data) {
            clipboardService.copyArray(clipboardService.TYPES.ELEMENT_TYPE, aliases, vm.nodes, data, 'icon-thumbnail-list', model.id, clearNodeForCopy);
        });
    };
    var copyAllEntriesAction = {
        labelKey: 'clipboard_labelForCopyAllEntries',
        labelTokens: [model.label],
        icon: 'documents',
        method: copyAllEntries,
        isDisabled: true
    };
    var removeAllEntries = function removeAllEntries() {
        localizationService.localizeMany([
            'content_nestedContentDeleteAllItems',
            'general_delete'
        ]).then(function (data) {
            overlayService.confirmDelete({
                title: data[1],
                content: data[0],
                close: function close() {
                    overlayService.close();
                },
                submit: function submit() {
                    vm.nodes = [];
                    setDirty();
                    updateModel();
                    overlayService.close();
                }
            });
        });
    };
    var removeAllEntriesAction = {
        labelKey: 'clipboard_labelForRemoveAllEntries',
        labelTokens: [],
        icon: 'trash',
        method: removeAllEntries,
        isDisabled: true
    };
    // helper to force the current form into the dirty state
    function setDirty() {
        if ($scope.$parent.$parent.propertyForm) {
            $scope.$parent.$parent.propertyForm.$setDirty();
        }
    }

    function addNode(alias) {
        var scaffold = getScaffold(alias);
        var newNode = createNode(scaffold, null);
        newNode.isChanged = true;
        newNode.isAdded = true;
        newNode.id = 0;
        setCurrentNode(newNode);
        setDirty();
        validate();
    }

    vm.openNodeTypePicker = function ($event) {
        if (vm.overlayMenu || vm.nodes.length >= vm.maxItems) {
            return;
        }
        vm.overlayMenu = {
            show: false,
            style: {},
            filter: vm.scaffolds.length > 12 ? true : false,
            orderBy: '$index',
            view: 'itempicker',
            event: $event,
            clickPasteItem: function clickPasteItem(item) {
                if (Array.isArray(item.data)) {
                    _.each(item.data, function (entry) {
                        pasteFromClipboard(entry);
                    });
                } else {
                    pasteFromClipboard(item.data);
                }
                vm.overlayMenu.show = false;
                vm.overlayMenu = null;
            },
            submit: function submit(model) {
                if (model && model.selectedItem) {
                    addNode(model.selectedItem.alias);
                }
                vm.overlayMenu.show = false;
                vm.overlayMenu = null;
            },
            close: function close() {
                vm.overlayMenu.show = false;
                vm.overlayMenu = null;
            }
        };
        // this could be used for future limiting on node types
        vm.overlayMenu.availableItems = [];
        _.each(vm.scaffolds, function (scaffold) {
            vm.overlayMenu.availableItems.push({
                alias: scaffold.contentTypeAlias,
                name: scaffold.contentTypeName,
                icon: iconHelper.convertFromLegacyIcon(scaffold.icon)
            });
        });
        if (vm.overlayMenu.availableItems.length === 0) {
            return;
        }
        vm.overlayMenu.size = vm.overlayMenu.availableItems.length > 6 ? 'medium' : 'small';
        vm.overlayMenu.pasteItems = [];

        var entriesForPaste = clipboardService.retrieveEntriesOfType(clipboardService.TYPES.ELEMENT_TYPE, contentTypeAliases);
        _.each(entriesForPaste, function (entry) {
            vm.overlayMenu.pasteItems.push({
                date: entry.date,
                name: entry.label,
                data: entry.data,
                icon: entry.icon
            });
        });

        vm.overlayMenu.title = labels.grid_addElement;
        vm.overlayMenu.hideHeader = vm.overlayMenu.pasteItems.length > 0;
        vm.overlayMenu.clickClearPaste = function ($event) {
            $event.stopPropagation();
            $event.preventDefault();
            clipboardService.clearEntriesOfType(clipboardService.TYPES.ELEMENT_TYPE, contentTypeAliases);
            vm.overlayMenu.pasteItems = [];
            // This dialog is not connected via the clipboardService events, so we need to update manually.
            vm.overlayMenu.hideHeader = false;
        };
        if (vm.overlayMenu.availableItems.length === 1 && vm.overlayMenu.pasteItems.length === 0) {
            // only one scaffold type - no need to display the picker
            addNode(vm.scaffolds[0].contentTypeAlias);
            vm.overlayMenu = null;
            return;
        }
        vm.overlayMenu.show = true;
    };

    vm.canDeleteNode = function (idx) {
        return vm.nodes.length > vm.minItems ? true : model.config.contentTypes.length > 1;
    };
    function deleteNode(idx) {
        var removedNode = vm.nodes.splice(idx, 1)[0];
        if (!removedNode.isAdded) {
            vm.deletedNodes.push(removedNode);
        }
        setDirty();
        updateModel();
        validate();
    }

    vm.requestDeleteNode = function (idx) {
        if (!vm.canDeleteNode(idx)) {
            return;
        }
        if (model.config.confirmDeletes === true) {
            localizationService.localizeMany([
                'content_nestedContentDeleteItem',
                'general_delete',
                'general_cancel',
                'contentTypeEditor_yesDelete'
            ]).then(function (data) {
                var overlay = {
                    title: data[1],
                    content: data[0],
                    closeButtonLabel: data[2],
                    submitButtonLabel: data[3],
                    submitButtonStyle: 'danger',
                    close: function close() {
                        overlayService.close();
                    },
                    submit: function submit() {
                        deleteNode(idx);
                        overlayService.close();
                    }
                };
                overlayService.open(overlay);
            });
        } else {
            deleteNode(idx);
        }
    };
    vm.getName = function (idx) {
        if (!model.data || !model.data.length) {
            return '';
        }
        var name = '';
        if (model.data[idx]) {
            var contentType = getContentTypeConfig(model.data[idx].ncContentTypeAlias);
            if (contentType != null) {
                // first try getting a name using the configured label template
                if (contentType.nameExp) {
                    // Run the expression against the stored dictionary value, NOT the node object
                    var item = model.data[idx];
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
        if (!model.data || !model.data.length) {
            return '';
        }
        var scaffold = getScaffold(model.data[idx].ncContentTypeAlias);
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
    function clearNodeForCopy(clonedData) {
        delete clonedData.key;
        delete clonedData.$$hashKey;
    }
    vm.showCopy = clipboardService.isSupported();
    vm.showPaste = false;
    vm.clickCopy = function ($event, node) {
        syncCurrentNode();
        clipboardService.copy('elementType', node.contentTypeAlias, node, null, null, null, clearNodeForCopy);
        $event.stopPropagation();
    };
    function pasteFromClipboard(newNode) {
        if (newNode === undefined) {
            return;
        }
        // generate a new key.
        newNode.key = String.CreateGuid();

        newNode.isAdded = true;
        newNode.id = 0;
        newNode.parentId = model.config.parentId;
        newNode.published = false;
        transformCopiedNode(newNode);

        vm.nodes.push(newNode);
        setDirty();

        setCurrentNode(newNode);
    }
    function checkAbilityToPasteContent() {
        vm.showPaste = clipboardService.hasEntriesOfType('elementType', contentTypeAliases) || clipboardService.hasEntriesOfType('elementTypeArray', contentTypeAliases);
    }
    eventsService.on('clipboardService.storageUpdate', checkAbilityToPasteContent);
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
            if (model.data) {
                for (var i = 0; i < model.data.length; i++) {
                    var item = model.data[i];
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
                    addNode(vm.scaffolds[0].contentTypeAlias);
                }
                modelWasChanged = true;
            }
            // If there is only one item, set it as current node
            if (vm.singleMode || vm.nodes.length === 1 && vm.maxItems === 1) {
                setCurrentNode(vm.nodes[0]);
            }
            validate();
            vm.inited = true;
            if (modelWasChanged) {
                updateModel();
            }
            updatePropertyActionStates();
            checkAbilityToPasteContent();
        }
    };
    function createNode(scaffold, fromNcEntry) {
        var node = angular.copy(scaffold);
        node.key = fromNcEntry && fromNcEntry.key ? fromNcEntry.key : String.CreateGuid();
        node.id = node.key;
        node.parentId = model.config.parentId;
        node.published = fromNcEntry?.published;
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
            model.data = newValues;
        }
        updatePropertyActionStates();
    }
    function updatePropertyActionStates() {
        copyAllEntriesAction.isDisabled = !model.data || !model.data.length;
        removeAllEntriesAction.isDisabled = copyAllEntriesAction.isDisabled;
    }
    var propertyActions = [
        copyAllEntriesAction,
        removeAllEntriesAction
    ];
    this.$onInit = function () {
        if (this.umbProperty) {
            this.umbProperty.setPropertyActions(propertyActions);
        }
    };
    var unsubscribeFormSubmitting = $scope.$on('formSubmitting', function (ev, args) {
        updateModel();
    });
    var unsubscribeContentSaved = eventsService.on("content.saved", function (event, args) {
        vm.saveChanges();
    })
    var validate = function validate() {
        if (vm.nodes.length < vm.minItems) {
            $scope.nestedContentForm.minCount.$setValidity('minCount', false);
        } else {
            $scope.nestedContentForm.minCount.$setValidity('minCount', true);
        }
        if (vm.nodes.length > vm.maxItems) {
            $scope.nestedContentForm.maxCount.$setValidity('maxCount', false);
        } else {
            $scope.nestedContentForm.maxCount.$setValidity('maxCount', true);
        }
    };
    var watcher = $scope.$watch(function () {
        return vm.nodes.length;
    }, function () {
        validate();
    });
    $scope.$on('$destroy', function () {
        unsubscribeFormSubmitting();
        unsubscribeContentSaved();
        watcher();
    });

    /* Saving */
    vm.saveChanges = function saveChanges() {
        updateModel();
        var basePromise = model.data.reduce((promise, x) => {
            var node = vm.nodes.find(y => y.key == x.key);
            node.currentVariant.publish = node.published;
            return promise.then(() => save(node, node.published ? contentResource.publish : contentResource.save));
        }, Promise.resolve());

        var basePromise = vm.deletedNodes.reduce((promise, x) => {
            return promise.then(() => contentResource.deleteById(x.id));
        }, basePromise);

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
            return contentResource.unpublish(node.id, node.currentVariant.language ? [node.currentVariant.language.culture] : null).then(() => {
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

        return action(node, node.isAdded, []);
    }

    /* Helper methods */
    var pageNamePropertyConfig = {
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
        "value": "",
        "alias": "name",
        "editor": "Umbraco.TextBox",
        "isSensitive": false,
        "culture": null,
        "segment": null,
        "propertyAlias": "name",
        "ncMandatory": false,
    }

    function transformNode(node, contentType) {
        node.currentVariant = getVariantByCulture(node, model.config.culture);
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

            var pageNameProp = angular.copy(pageNamePropertyConfig);
            pageNameProp.culture = model.config.culture;
            pageNameProp.value = name;
            tab.properties.unshift(pageNameProp);
        }
    }

    function transformCopiedNode(node) {
        var oldVariant = getVariantByCulture(node, node.currentVariant?.language?.culture);
        oldVariant["publish"] = false;
        oldVariant["save"] = false;
        
        // copy properties in case it is the same variant
        var oldProperties = angular.copy(oldVariant.tabs[0].properties);
        // Remove pageName from inserted node
        oldVariant.tabs[0].properties.shift();

        node.currentVariant = getVariantByCulture(node, model.config.culture);
        node.currentVariant["publish"] = true;
        node.currentVariant["save"] = true;

        var tab = node.currentVariant.tabs[0];
        node.currentVariant.tabs = [];
        if (tab) {
            node.currentVariant.tabs.push(tab);

            var pageNameProp = angular.copy(pageNamePropertyConfig);
            pageNameProp.culture = model.config.culture;
            tab.properties.unshift(pageNameProp);

            angular.forEach(tab.properties, function (property) {
                if (_.find(notSupported, function (x) {
                    return x === property.editor;
                })) {
                    property.notSupported = true;
                    // TODO: Not supported message to be replaced with 'content_nestedContentEditorNotSupported' dictionary key. Currently not possible due to async/timing quirk.
                    property.notSupportedMessage = 'Property ' + property.label + ' uses editor ' + property.editor + ' which is not supported by Nested Content.';
                }

                var oldProperty = oldProperties.find(x => x.propertyAlias === property.propertyAlias || x.propertyAlias === property.alias);
                property.value = oldProperty.value;
                oldProperty.value = null;
            });
        }
    }

    function getVariantByCulture(node, culture) {
        if (culture)
            return node.variants.find(x => x.language.culture == model.config.culture)
        return node.variants[0];
    }
}