using Umbraco.Cms.Core.PropertyEditors;

namespace NestedPagesView.Configuration
{
    /// <summary>
    /// Represents the configuration for the sectionlistview value editor.
    /// </summary>
    public class NestedPagesViewConfiguration
    {
        [ConfigurationField("allowedContainer", "Allow container of type", "treesourcetypepicker", Description = "Select the applicable container ")]
        public string AllowedContainer { get; set; }

        [ConfigurationField("startNode", "Additional field", "treesource", Description = "Not related to configuration, applicable container does not work without it")]
        public MultiNodePickerConfigurationTreeSource TreeSource { get; set; }
    }
}
