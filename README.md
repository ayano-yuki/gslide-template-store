# gslide-template-store

Google Slides templates release artifact store.

This repository stores exported Google Slides templates as versioned release artifacts.

Google Slides is the source of truth. This repository is used only for distribution, version pinning, and release history.

## Repository layout

```txt
gslide-template-store/
├── templates/
│   ├── template-a/
│   │   ├── template-a_v1.0.0.pptx
│   │   ├── template-a_v1.0.0.pdf
│   │   ├── latest.pptx
│   │   └── latest.pdf
│   └── template-b/
│       ├── template-b_v1.0.0.pptx
│       ├── template-b_v1.0.0.pdf
│       ├── latest.pptx
│       └── latest.pdf
├── sources/
│   ├── template-a.link.txt
│   └── template-b.link.txt
├── config/
│   └── templates.json
├── apps-script/
│   ├── Code.gs
│   └── appsscript.json
├── CHANGELOG.md
└── .github/
    └── workflows/
        └── validate.yml
```

## Operating model

- Google Slides is the only editing surface.
- This repository stores exported `.pptx` and `.pdf` files.
- Versioned files are immutable.
- `latest.pptx` and `latest.pdf` point to the latest stable release for each template.
- Each template is managed independently.
