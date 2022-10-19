angular.module('umbraco').controller('NestedContentWrapper', NestedContentWrapper);

function NestedContentWrapper($scope, $routeParams, editorState, sectionContainerResource) {
    $scope.inited = false;
    $scope.viewmodel = {
        config: {}
    };
    $scope.options = {
        allowedContainer: $scope.model.config.allowedContainer
    }

    function loadAllowedTypes(id) {
        return sectionContainerResource.getAllowedSections(id, $scope.options.allowedContainer)
            .then(function (data) {
                $scope.viewmodel.config.contentTypes = data.data.map(x => ({
                    ncAlias: x.alias,
                    ncTabAlias: "Content",
                    nameTemplate: "{{name}} "
                }));
            });
    }

    function loadPagesData(id) {
        return sectionContainerResource.getAllSections(id, $scope.options.allowedContainer,  $scope.model.culture)
            .then(function (data) {

                $scope.viewmodel.value = data.data.items.map(x => {

                    var mapped = {
                        key: x.id,
                        name: x.name,
                        ncContentTypeAlias: x.contentTypeAlias,
                        published: x.published,
                        parentId: x.parentId
                    };

                    _.each(x.properties, (item, index) => {
                        mapped[item.alias] = item.value;
                    });
                    return mapped;
                });

                $scope.viewmodel.originalValue = angular.copy($scope.viewmodel.value);
            });
    }

    function loadParentId(id){
        return sectionContainerResource.getContainerId(id, $scope.options.allowedContainer)
        .then(function (data){
            $scope.viewmodel.config.parentId = data.data;
        });
    }

    function initView() {
        var id = $routeParams.id;
        if (id === undefined) {
            return;
        }

        $scope.viewmodel.config.confirmDeletes = true;
        $scope.viewmodel.config.showIcons = true;
        $scope.viewmodel.config.culture = $scope.model.culture;

        $scope.contentId = editorState.current ? editorState.current.id : id;
        sectionContainerResource.getContainerId($scope.contentId, $scope.options.allowedContainer).then(data => {
            $scope.containerId = data.data;
            $scope.viewmodel.id = data.data;
        });

        $scope.isTrashed = editorState.current ? editorState.current.trashed : id === "-20" || id === "-21";

        if ($scope.isTrashed !== false) {
            return;
        }

        loadAllowedTypes(id)
            .then(() => loadPagesData(id))
            .then(() => loadParentId(id))
            .then(() => {
                $scope.inited = true;
            })
    }

    initView();
    $scope.model.value = 0;
}