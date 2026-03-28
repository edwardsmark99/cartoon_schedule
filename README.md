# Cartoon Schedule Builder

A lightweight web app for producing an easy-to-read "cartoon schedule" that can be copied into presentations.

## Features

- Import activities via CSV (`id,name,swimlane,duration,dependencies,milestone`).
- Add/edit activities in an in-app tabular form.
- Start with pre-populated example data.
- Swim-lane based schedule chart with color-themed lanes.
- Optional critical-path highlighting (red outline).
- Milestone rendering (diamond markers).
- UK (England & Wales) national bank holidays and weekends treated as non-working days.
- Export chart as SVG or PNG for easy use in PowerPoint.

## Run locally

Because this is a static app, you can open `index.html` directly, or serve it from a local web server:

```bash
python3 -m http.server 8080