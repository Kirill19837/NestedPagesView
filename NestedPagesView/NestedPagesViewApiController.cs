using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Dictionary;
using Umbraco.Cms.Core.Mapping;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.ContentEditing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.BackOffice.Controllers;
using Umbraco.Extensions;

namespace NestedPagesView
{
    public class NestedPagesViewApiController : UmbracoAuthorizedApiController
    {
        private readonly ICultureDictionary _cultureDictionary;
        private readonly IContentService _contentService;
        private readonly ILocalizedTextService _localizedTextService;
        private readonly IContentTypeService _contentTypeService;
        private readonly IContentTypeBaseServiceProvider _contentTypeBaseServiceProvider;
        private readonly IUmbracoMapper _umbracoMapper;
        private readonly ILogger<NestedPagesViewApiController> _logger;

        public NestedPagesViewApiController(ICultureDictionary cultureDictionary, IContentTypeBaseServiceProvider contentTypeBaseServiceProvider,
            IContentTypeService contentTypeService, IUmbracoMapper umbracoMapper,
            IContentService contentService, ILogger<NestedPagesViewApiController> logger,
            ILocalizedTextService localizedTextService)
        {
            _cultureDictionary = cultureDictionary;
            _contentService = contentService;
            _localizedTextService = localizedTextService;
            _contentTypeService = contentTypeService;
            _contentTypeBaseServiceProvider = contentTypeBaseServiceProvider;
            _umbracoMapper = umbracoMapper;
            _logger = logger;
        }

        [HttpGet]
        public int GetContainerId(int nodeId, string allowedSectionContainerAlias) =>
            GetSectionContainer(nodeId, allowedSectionContainerAlias)?.Id ?? 0;

        [HttpGet]
        public PagedResult<ContentItemBasic<ContentPropertyBasic>> GetAllSections(int nodeId, string allowedSectionContainerAlias, string cultureName)
        {
            var contentItem = GetSectionContainer(nodeId, allowedSectionContainerAlias);
            var sections = contentItem != null
                            ? _contentService.GetPagedChildren(contentItem.Id, 0, 100, out var totalRecords)
                            : Enumerable.Empty<IContent>();
            var mappedSections = sections.Select(content =>
                            _umbracoMapper.Map<IContent, ContentItemBasic<ContentPropertyBasic>>(content,
                                context =>
                                {
                                    context.SetCulture(cultureName);
                                }))
                            .ToList();


            var result = new PagedResult<ContentItemBasic<ContentPropertyBasic>>(mappedSections.Count, 1, 10);
            result.Items = mappedSections;
            return result;

        }

        [HttpGet]
        public IEnumerable<ContentTypeBasic> GetAllowedSections(int nodeId, string allowedSectionContainerAlias)
        {
            var contentItem = GetSectionContainer(nodeId, allowedSectionContainerAlias);
            if (contentItem == null)
            {
                return Enumerable.Empty<ContentTypeBasic>();
            }

            var contentType = _contentTypeBaseServiceProvider.GetContentTypeOf(contentItem);
            var ids = contentType.AllowedContentTypes.OrderBy(c => c.SortOrder).Select(x => x.Id.Value).ToArray();

            if (ids.Any() == false) return Enumerable.Empty<ContentTypeBasic>();

            var types = _contentTypeService.GetAll(ids).OrderBy(c => ids.IndexOf(c.Id)).ToList();

            var basics = types.Where(type => type.IsElement == false).Select(_umbracoMapper.Map<IContentType, ContentTypeBasic>).ToList();

            var localizedTextService = _localizedTextService;
            foreach (var basic in basics)
            {
                basic.Name = localizedTextService.UmbracoDictionaryTranslate(_cultureDictionary, basic.Name);
                basic.Description = localizedTextService.UmbracoDictionaryTranslate(_cultureDictionary, basic.Description);
            }

            //map the blueprints
            var blueprints = _contentService.GetBlueprintsForContentTypes(types.Select(x => x.Id).ToArray()).ToArray();
            foreach (var basic in basics)
            {
                var docTypeBluePrints = blueprints.Where(x => x.ContentTypeId == (int)basic.Id).ToArray();
                foreach (var blueprint in docTypeBluePrints)
                {
                    basic.Blueprints[blueprint.Id] = blueprint.Name;
                }
            }

            return basics.OrderBy(c => nodeId == Constants.System.Root ? c.Name : string.Empty);
        }


        private IContent GetSectionContainer(int nodeId, string allowedSectionContainerAlias) =>
            _contentService.GetPagedChildren(nodeId, 0, 100, out var totalRecords)
                .FirstOrDefault(x => x.ContentType.Alias.Equals(allowedSectionContainerAlias));
    }
}
