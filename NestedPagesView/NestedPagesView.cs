using NestedPageView.Lib.ConfigurationEditor;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.PropertyEditors;

namespace NestedPagesView
{

    [DataEditor(
        alias: "NestedPagesView",
        name: "Nested Pages View",
        view: "~/App_Plugins/NestedPagesView/index.html",
        HideLabel = false,
        Group = "Lists",
        Icon = "icon-thumbnail-list")]
    public class NestedPagesViewPropertyEditor : DataEditor
    {
        private readonly IIOHelper _iioHelper;

        public NestedPagesViewPropertyEditor(
            IDataValueEditorFactory dataValueEditorFactory,
            IIOHelper iioHelper)
            : base(dataValueEditorFactory)
        {
            _iioHelper = iioHelper;
        }

        protected override IConfigurationEditor CreateConfigurationEditor() => new NestedPagesViewConfigurationEditor(_iioHelper);
    }
}
