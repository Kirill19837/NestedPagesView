using NestedPagesView.Configuration;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.PropertyEditors;

namespace NestedPagesView.ConfigurationEditor
{
    /// <summary>
    /// Represents the configuration editor for the sectionlistview value editor.
    /// </summary>
    public class NestedPagesViewConfigurationEditor : ConfigurationEditor<NestedPagesViewConfiguration>
    {
        public NestedPagesViewConfigurationEditor(IIOHelper ioHelper) : base(ioHelper)
        {
        }
    }
}
