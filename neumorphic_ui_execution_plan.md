# RELAY — NEUMORPHIC & SKEUOMORPHIC UI EXECUTION PLAN

_Agent-ready implementation schedule • 2 Work Blocks (4 Hours Total UI Focus) • 15-minute execution checkpoints_

---

## 1. Design System Specification

### Color Palette & Neumorphic Variables
- **Base Surface Color:** `#292b30`
- **Soft Light Drop-Shadow:** `-6px -6px 12px rgba(255, 255, 255, 0.08)`
- **Soft Dark Drop-Shadow:** `6px 6px 12px rgba(0, 0, 0, 0.4)`
- **Recessed Inner Shadows (Concave):** `inset 6px 6px 12px rgba(0, 0, 0, 0.4), inset -6px -6px 12px rgba(255, 255, 255, 0.08)`
- **Small Variant Offset:** `3px 3px 6px` (for small elements, ports, and buttons)
- **Status LED Glow Colors:**
  - Idle/Pending: `#ffaa00` (`shadow-[0_0_8px_rgba(255,170,0,0.6)]`)
  - Running/Success: `#00ff88` (`shadow-[0_0_10px_rgba(255,255,136,0.8)]`)
  - Failed/Error: `#ff3366` (`shadow-[0_0_10px_rgba(255,51,102,0.8)]`)
  - Active/Cyan: `#00bfff` (`shadow-[0_0_12px_rgba(0,191,255,0.9)]`)

---

## 2. File Directory Structure

Create/extend the following file layout in `apps/web/src`:

```text
apps/web/src/
├── styles/
│   └── neumorphic.css           # Utility classes for protrude/recess shadows
├── components/
│   ├── ui/
│   │   ├── StatusLED.tsx         # Reusable glowing LED light component
│   │   ├── NeumoButton.tsx       # Tactile pressable buttons
│   │   ├── NeumoCard.tsx         # Protruding surface containers
│   │   └── NeumoInput.tsx        # Recessed code editor & text inputs
│   ├── layout/
│   │   ├── Header.tsx            # Top header bar with run controls & revision counter
│   │   ├── NodePalette.tsx       # Left draggable module palette
│   │   └── InspectorPanel.tsx    # Right panel with configuration & runtime stats
│   └── nodes/
│       ├── NeumoNodeShell.tsx    # Custom React Flow node container with ports
│       └── CustomEdges.tsx       # Glowing SVG edges with dash animation
```

---

## 3. Step-by-Step 15-Minute Execution Protocol

### Block 1: Design Tokens & Base Shell (2 Hours)

| Checkpoint | Scope & Action Items | Verification |
|---|---|---|
| **00:00 - 00:15** | Set up `styles/neumorphic.css` and configure custom Tailwind utility classes (`neumo-protrude`, `neumo-recess`, `neumo-protrude-sm`, `neumo-recess-sm`). | Verify base background `#292b30` renders properly without visual artifacts or incorrect shadows. |
| **00:15 - 00:30** | Create `components/ui/StatusLED.tsx` supporting `idle`, `running`, `failed`, and `cyan` modes with drop-shadow glows. | Render all 4 LED states on a test page to confirm radial glow effects look correct. |
| **00:30 - 00:45** | Build `components/ui/NeumoButton.tsx` with tactile `active:` physics (transitioning from protrude to recess state on `mousedown`). | Verify interactive press state feels tactile and responsive. |
| **00:45 - 01:00** | Implement `components/layout/Header.tsx` featuring the protrude style, logo branding, revision status badge, and the main RUN trigger button. | Ensure header layout maintains alignment and proper shadow depth. |
| **01:00 - 01:15** | Implement `components/layout/NodePalette.tsx` on the left sidebar featuring module items for Trigger, Transform, Condition, and Output. | Hovering and clicking palette items should give an inset tactile depth reaction. |
| **01:15 - 01:30** | Build `components/layout/InspectorPanel.tsx` on the right sidebar containing recessed text inputs, toggle switches, and metric stat blocks. | Text area input and switches switch state smoothly inside recessed panels. |
| **01:30 - 01:45** | Combine Header, Palette, Canvas space, and Inspector into `apps/web/src/pages/Studio.tsx` to form the full app shell layout. | Verify complete 3-column layout adapts cleanly to full viewport width/height. |
| **01:45 - 02:00** | **Block 1 Checkpoint:** Run `npm run dev` and perform a visual check of depth contrast across all static UI elements. | Confirm zero contrast clipping issues or missing shadow parameters. |

---

### Block 2: Canvas Integration & React Flow Customization (2 Hours)

| Checkpoint | Scope & Action Items | Verification |
|---|---|---|
| **02:00 - 02:15** | Create `components/nodes/NeumoNodeShell.tsx` to wrap `@xyflow/react` node payloads inside a soft protrude card with status LEDs. | Custom node shell renders cleanly on the canvas surface. |
| **02:15 - 02:30** | Integrate Neumorphic handles (Ports) with circular inset shadow wells (`neumoRecessSm`) on the left and right sides of nodes. | Edges can successfully snap to the center of the tactile ports. |
| **02:30 - 02:45** | Configure the custom dot-matrix grid canvas background using SVG pattern `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)`. | Grid background sits neatly within the recessed canvas background. |
| **02:45 - 03:00** | Create `components/nodes/CustomEdges.tsx` to render neon SVG connection lines (`#00bfff`) with Gaussian blur glow filters. | Edges draw correctly between nodes with visible neon glow styling. |
| **03:00 - 03:15** | Wire execution animation state: apply stroke-dashoffset animation on connection lines when `isRunning` or execution events fire. | Clicking RUN animates dashed lines along active edges. |
| **03:15 - 03:30** | Connect node selection in the canvas to populate the right Inspector panel dynamically with actual node data. | Selecting a node updates the inspector title and configuration parameters. |
| **03:30 - 03:45** | Connect execution engine Socket.IO events to trigger state changes in the status LEDs (`running` -> `success` / `failed`). | Node LEDs transition through status states dynamically during runs. |
| **03:45 - 04:00** | **Final Checkpoint:** Full regression check across the end-to-end workflow (Drag module -> connect edge -> edit config -> run execution). | Build passes with zero console warnings and complete tactile interface styling. |

---

## 4. Copy-Paste Instructions for Antigravity Agent

```text
Follow the Neumorphic UI Execution Plan to implement the tactile interface in `apps/web`:
1. Use `#292b30` as the main surface background color.
2. Implement utility classes for protruding shadows (`6px 6px 12px rgba(0,0,0,0.4), -6px -6px 12px rgba(255,255,255,0.08)`) and recessed shadows (`inset 6px 6px 12px rgba(0,0,0,0.4), inset -6px -6px 12px rgba(255,255,255,0.08)`).
3. Create custom React Flow nodes and edges using `NeumoNodeShell` and `CustomEdges`.
4. Ensure interactive elements transform between protrude and recess on active user clicks.
5. Execute Block 1 and Block 2 tasks sequentially in 15-minute intervals.
```