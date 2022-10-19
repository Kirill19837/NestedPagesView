angular.module('umbraco').controller('NestedContentWrapper', NestedContentWrapper);

function NestedContentWrapper($scope, $routeParams, editorState, nestedPagesViewResource) {
    $scope.inited = false;

    $scope.options = {
        allowedContainer: $scope.model.config.allowedContainer
    }

    function loadAllowedTypes(id) {
        return nestedPagesViewResource.getAllowedSections(id, $scope.options.allowedContainer)
            .then(function (data) {
                $scope.model.config.contentTypes = data.data.map(x => ({
                    ncAlias: x.alias,
                    ncTabAlias: "Content",
                    nameTemplate: "{{name}} "
                }));
            });
    }

    function loadPagesData(id) {
        return nestedPagesViewResource.getAllSections(id, $scope.options.allowedContainer,  $scope.model.culture)
            .then(function (data) {

                $scope.model.data = data.data.items.map(x => {

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

                $scope.model.originalValue = angular.copy($scope.model.data);
            });
    }

    function loadParentId(id){
        return nestedPagesViewResource.getContainerId(id, $scope.options.allowedContainer)
        .then(function (data){
            $scope.model.config.parentId = data.data;
        });
    }

    function initView() {
        var id = $routeParams.id;
        if (id === undefined) {
            return;
        }

        $scope.model.config.confirmDeletes = true;
        $scope.model.config.showIcons = true;
        $scope.model.config.culture = $scope.model.culture;

        $scope.contentId = editorState.current ? editorState.current.id : id;
        nestedPagesViewResource.getContainerId($scope.contentId, $scope.options.allowedContainer).then(data => {
            $scope.containerId = data.data;
            $scope.model.id = data.data;
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
}