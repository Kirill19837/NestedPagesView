# NestedPagesView

A powerful Umbraco CMS property editor plugin for bulk editing of container's children pages. This plugin provides enhanced functionality for managing nested content with support for multi-language websites and split-view editing.

## Features

- 🏗️ **Bulk Editing**: Edit multiple child pages within a container simultaneously
- 🌍 **Multi-Language Support**: Full support for multi-language Umbraco websites
- 📱 **Split-View Editing**: Enhanced editing experience with split-view functionality
- 🎯 **Container-Based**: Works with specific container document types
- 🔧 **Configurable**: Flexible configuration options for different use cases

## Installation

### NuGet Package Manager

Install the package via NuGet Package Manager in Visual Studio:

```
Install-Package NestedPagesView
```

### Package Manager Console

```
dotnet add package NestedPagesView
```

### PackageReference

Add the following to your `.csproj` file:

```xml
<PackageReference Include="NestedPagesView" Version="1.0.5" />
```

## Requirements

- **Umbraco CMS**: Version 13.9.2 or higher
- **.NET**: Version 8.0 or higher

## Usage

### 1. Create a Data Type

1. Go to the **Settings** section in your Umbraco backoffice
2. Right-click on **Data Types** and select **Create**
3. Choose **Nested Pages View** from the list of property editors
4. Configure the data type:
   - **Name**: Give your data type a meaningful name (e.g., "Child Pages Editor")
   - **Allow container of type**: Select the document type that will act as the container
   - **Additional field**: Configure the tree source (required for proper functionality)

### 2. Add to Document Type

1. Go to **Settings** → **Document Types**
2. Select or create the document type you want to use
3. Add a new property and select your "Child Pages Editor" data type
4. Save the document type

### 3. Use in Content

1. Navigate to the **Content** section
2. Create or edit content using your configured document type
3. Use the Nested Pages View property to bulk edit child pages
4. The editor will display all child pages of the specified container type for easy editing

## Configuration Options

### Allow Container of Type
Specifies which document types can act as containers for the nested pages view. Only child pages of the selected container types will be available for editing.

### Tree Source Configuration
Additional configuration field that provides tree source functionality. This field is required for proper operation of the container type selection.

## Development

### Prerequisites

- .NET 8.0 SDK
- Visual Studio 2022 or VS Code
- Umbraco CMS 13.9.2+

### Building the Project

1. Clone the repository:
```bash
git clone https://github.com/Kirill19837/NestedPagesView.git
cd NestedPagesView
```

2. Restore NuGet packages:
```bash
dotnet restore
```

3. Build the solution:
```bash
dotnet build
```

### Project Structure

```
NestedPagesView/
├── NestedPagesView/
│   ├── App_Plugins/
│   │   └── NestedPagesView/           # Frontend assets
│   │       ├── components/           # AngularJS components
│   │       ├── views/               # HTML templates
│   │       ├── resources/           # API resources
│   │       ├── lang/                # Language files
│   │       ├── styles.css           # Styles
│   │       ├── index.html           # Main view
│   │       └── package.manifest     # Plugin manifest
│   ├── Configuration/               # Configuration models
│   ├── ConfigurationEditor/         # Configuration editor
│   ├── build/                      # Build targets
│   ├── NestedPagesView.cs          # Main property editor
│   ├── NestedPagesViewApiController.cs # API controller
│   └── NestedPagesView.csproj      # Project file
└── NestedPagesView.sln             # Solution file
```

### Frontend Technologies

- **AngularJS**: Frontend framework used by Umbraco backoffice
- **HTML/CSS**: Standard web technologies for UI
- **JavaScript**: Custom components and functionality

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/Kirill19837/NestedPagesView/blob/main/LICENSE) file for details.

## Author

**Kirill19837**
- GitHub: [@Kirill19837](https://github.com/Kirill19837)
- Repository: [NestedPagesView](https://github.com/Kirill19837/NestedPagesView)

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/Kirill19837/NestedPagesView/issues) section
2. Create a new issue if your problem isn't already reported
3. Provide as much detail as possible, including:
   - Umbraco version
   - .NET version
   - Steps to reproduce the issue
   - Expected vs actual behavior

## Changelog

### Version 1.0.5 (Current)
- Compatible with Umbraco CMS 13.9.2
- Support for .NET 8.0
- Multi-language website support
- Split-view editing functionality

---

*This package is available on the [Umbraco Marketplace](https://marketplace.umbraco.com/) and tagged with: `umbraco-marketplace`, `umbraco`, `plugin`, `package`*