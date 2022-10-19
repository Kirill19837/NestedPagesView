angular.module('umbraco.directives').directive('umbNestedPageEditor', [function () {
    var link = function link($scope) {

        $scope.model = angular.copy($scope.ngModel);
        $scope.nodeContext = $scope.model;

        $scope.defaultVariant = $scope.model.variants.find(x => x.language.isDefault);

        var selectedTab = $scope.model.currentVariant.tabs[0];
        if ($scope.tabAlias) {
            angular.forEach($scope.model.variants[0].tabs, function (tab) {
                if (tab.alias.toLowerCase() === $scope.tabAlias.toLowerCase()) {
                    selectedTab = tab;

                }
            });
        }
        $scope.tab = selectedTab;

        var unsubscribe = $scope.$on('ncSyncVal', function (ev, args) {
            if (args.key === $scope.model.key) {
                // Tell inner controls we are submitting
                $scope.$broadcast('formSubmitting', { scope: $scope });
                $scope.ngModel.isChanged = true;
                // Sync the values back
                angular.forEach($scope.ngModel.currentVariant.tabs, function (tab) {
                    if (tab.alias.toLowerCase() === selectedTab.alias.toLowerCase()) {
                        var localPropsMap = selectedTab.properties.reduce(function (map, obj) {
                            map[obj.alias] = obj;
                            return map;
                        }, {});
                        angular.forEach(tab.properties, function (prop) {
                            if (localPropsMap.hasOwnProperty(prop.alias)) {
                                prop.value = localPropsMap[prop.alias].value;
                            }
                        });
                    }
                });
            }
        });
        $scope.$on('$destroy', function () {
            unsubscribe();
        });

        $scope.propertyEditorDisabled = function (property) {
            var contentLanguage = $scope.model.currentVariant.language;
            var canEditCulture = !contentLanguage || property.culture === contentLanguage.culture || null == property.culture && contentLanguage.isDefault;
            var canEditSegment = property.segment === $scope.model.currentVariant.segment;
            return !canEditCulture || !canEditSegment;
        }
    };
    return {
        restrict: 'E',
        replace: true,
        templateUrl: Umbraco.Sys.ServerVariables.application.applicationPath + "App_Plugins/NestedPagesView/views/umbNestedPageEditor.html",
        scope: {
            ngModel: '=',
            tabAlias: '='
        },
        link: link
    };
}]);