function nestedPagesViewResource($http) {
	const baseUrl = '/umbraco/backoffice/api/NestedPagesViewApi/';

	return {
		getAllSections: function (nodeId, allowedSectionContainerAlias, cultureName) {
			return $http.get(baseUrl + 'GetAllSections?nodeId=' + nodeId + '&allowedSectionContainerAlias=' + allowedSectionContainerAlias + '&cultureName=' + cultureName);
		},
		getAllowedSections: function (nodeId, allowedSectionContainerAlias) {
			return $http.get(baseUrl + 'GetAllowedSections?nodeId=' + nodeId + '&allowedSectionContainerAlias=' + allowedSectionContainerAlias);
		},
		getContainerId: function (nodeId, allowedSectionContainerAlias) {
			return $http.get(baseUrl + 'GetContainerId?nodeId=' + nodeId + '&allowedSectionContainerAlias=' + allowedSectionContainerAlias);
		}
	}
}

angular.module('umbraco.resources').factory('nestedPagesViewResource', nestedPagesViewResource);
