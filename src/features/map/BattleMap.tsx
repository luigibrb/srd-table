/**
 * The battle map: a 5-foot grid drawn in SVG with the encounter's walls, Difficult Terrain and
 * blocked squares, zones, tokens, and the reach, range or area of the option being composed.
 * Clicks become encounter actions (`place`, `move` with `to`, `set_terrain`, `add_wall`,
 * `remove_wall`); the engine decides whether they happen. Everything here is also reachable
 * without the map (target lists, the selection panel).
 */

import { type PointerEvent, useMemo, useRef, useState } from "react";
import type { Encounter } from "srd-rules-engine";
import { Icon, type IconName } from "@/components/Icon";
import { Button, cx, Reasons } from "@/components/ui";
import type { CombatantView, EncounterView } from "@/engine/facade";
import { t } from "@/i18n";
import { useDistance, useMovePreview, useReachable } from "@/queries";
import { useDocuments } from "@/store/documents";
import { alliedSides, type MapTool, useTableUi } from "../encounter/tableUi";

const CELL = 44;
const MIN_W = 24;
const MIN_H = 16;
const PAD = 4;

interface Square {
  x: number;
  y: number;
}

const parse = (key: string): Square => {
  const [x, y] = key.split(",").map(Number);
  return { x: x ?? 0, y: y ?? 0 };
};

export function BattleMap({
  encounterId,
  encounter,
  view,
  gm,
  controllable,
}: {
  encounterId: string;
  encounter: Encounter;
  view: EncounterView;
  gm: boolean;
  /** Combatants the viewer may move. */
  controllable: (c: CombatantView) => boolean;
}) {
  const send = useDocuments((s) => s.encounterAction);
  const ui = useTableUi();
  const [zoom, setZoom] = useState(1);
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  const [measure, setMeasure] = useState<{ from: Square | null; to: Square | null }>({
    from: null,
    to: null,
  });
  const [wallStart, setWallStart] = useState<Square | null>(null);
  const [hover, setHover] = useState<Square | null>(null);
  const painting = useRef(false);
  const distance = useDistance(measure.from, measure.to);
  const selectedForMove = view.combatants.find((c) => c.id === ui.selected) ?? null;
  const moving =
    ui.tool === "move" && !ui.aiming && selectedForMove?.position && controllable(selectedForMove)
      ? selectedForMove.id
      : null;
  // Where the selected combatant can go, and what moving to the hovered square would do.
  const reachable = useReachable(encounterId, moving);
  const reachableSet = useMemo(
    () => new Set((reachable.data?.squares ?? []).map((p) => `${p.x},${p.y}`)),
    [reachable.data],
  );
  const movePreview = useMovePreview(encounterId, moving, moving && hover ? hover : null);

  const bounds = useMemo(() => {
    const xs: number[] = [0, MIN_W - 1];
    const ys: number[] = [0, MIN_H - 1];
    for (const c of view.combatants) {
      if (c.position) {
        xs.push(c.position.x + c.space - 1);
        ys.push(c.position.y + c.space - 1);
      }
    }
    for (const w of encounter.map.walls) {
      xs.push(w.from.x, w.to.x);
      ys.push(w.from.y, w.to.y);
    }
    for (const sq of [...encounter.map.difficult, ...encounter.map.blocked]) {
      xs.push(sq.x);
      ys.push(sq.y);
    }
    return {
      minX: Math.min(0, ...xs),
      minY: Math.min(0, ...ys),
      maxX: Math.max(...xs) + PAD,
      maxY: Math.max(...ys) + PAD,
    };
  }, [view.combatants, encounter.map]);
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;

  const selected = view.combatants.find((c) => c.id === ui.selected) ?? null;

  async function act(action: Parameters<typeof send>[1]) {
    const result = await send(encounterId, action);
    setReasons(result.ok ? null : result.reasons);
    return result.ok;
  }

  function squareAt(e: PointerEvent<SVGSVGElement>): Square {
    const svg = e.currentTarget;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const local = point.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: Math.floor(local.x / CELL), y: Math.floor(local.y / CELL) };
  }

  function cornerAt(e: PointerEvent<SVGSVGElement>): Square {
    const svg = e.currentTarget;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const local = point.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: Math.round(local.x / CELL), y: Math.round(local.y / CELL) };
  }

  function onSquare(square: Square, e: PointerEvent<SVGSVGElement>) {
    if (ui.aiming) {
      ui.aiming.onPick(ui.aiming.corner ? cornerAt(e) : square);
      return;
    }
    switch (ui.tool) {
      case "move":
        if (selected && controllable(selected))
          void act({ type: "move", id: selected.id, to: square });
        break;
      case "place":
        if (selected && gm) void act({ type: "place", id: selected.id, x: square.x, y: square.y });
        break;
      case "measure":
        setMeasure((m) =>
          m.from && !m.to ? { from: m.from, to: square } : { from: square, to: null },
        );
        break;
      case "walls": {
        const corner = cornerAt(e);
        if (!wallStart) setWallStart(corner);
        else {
          if (wallStart.x !== corner.x || wallStart.y !== corner.y) {
            void act({ type: "add_wall", from: wallStart, to: corner });
          }
          setWallStart(null);
        }
        break;
      }
      case "difficult":
      case "blocked":
      case "clear":
        void act({ type: "set_terrain", squares: [square], kind: ui.tool });
        break;
      case "ping":
        ui.setPing(square);
        setTimeout(() => useTableUi.getState().setPing(null), 3000);
        break;
      default:
        break;
    }
  }

  const highlight = useMemo(() => ui.highlight.map(parse), [ui.highlight]);
  const candidates = new Set(ui.candidates);
  const allies = alliedSides(view);
  const difficult = encounter.map.difficult;
  const blocked = encounter.map.blocked;

  const tools: { tool: MapTool; icon: IconName; label: string; gmOnly?: boolean }[] = [
    { tool: "select", icon: "target", label: t("map.select") },
    { tool: "move", icon: "move", label: t("map.move") },
    { tool: "measure", icon: "ruler", label: t("map.measure") },
    { tool: "ping", icon: "ping", label: t("map.ping") },
    { tool: "place", icon: "users", label: t("map.place"), gmOnly: true },
    { tool: "walls", icon: "wall", label: t("map.walls"), gmOnly: true },
    { tool: "difficult", icon: "terrain", label: t("map.difficult"), gmOnly: true },
    { tool: "blocked", icon: "lock", label: t("map.blocked"), gmOnly: true },
    { tool: "clear", icon: "x", label: t("map.clear"), gmOnly: true },
  ];

  const hint = ui.aiming
    ? t("map.areaHint", { name: selected?.name ?? "" })
    : ui.tool === "move" && selected
      ? movePreview.data && hover
        ? movePreview.data.ok
          ? t("map.movePreview", {
              cost: movePreview.data.cost,
              left: movePreview.data.movement_left,
            }) +
            (movePreview.data.opportunity_attacks.length
              ? ` ${t("map.opportunity", {
                  names: movePreview.data.opportunity_attacks
                    .map((id) => view.combatants.find((c) => c.id === id)?.name ?? id)
                    .join(", "),
                })}`
              : "") +
            movePreview.data.zones.map((z) => ` ${z.label}`).join("")
          : movePreview.data.reasons.join(" ")
        : t("map.moveHint", { name: selected.name })
      : ui.tool === "place" && selected
        ? t("map.placeHint", { name: selected.name })
        : ui.tool === "measure"
          ? t("map.measureHint")
          : ui.tool === "walls"
            ? t("map.wallHint")
            : ["difficult", "blocked", "clear"].includes(ui.tool)
              ? t("map.terrainHint")
              : null;

  return (
    <section
      aria-label={t("map.title")}
      className="relative flex h-full min-h-[18rem] flex-col overflow-hidden rounded border border-edge bg-mat"
    >
      <div
        className="absolute top-2 left-2 z-10 flex flex-col gap-1"
        role="toolbar"
        aria-label={t("map.tools")}
      >
        {tools
          .filter((x) => gm || !x.gmOnly)
          .map((x) => (
            <Button
              key={x.tool}
              size="sm"
              icon={x.icon}
              iconOnly
              label={x.label}
              on={ui.tool === x.tool}
              aria-pressed={ui.tool === x.tool}
              onClick={() => {
                ui.setTool(x.tool);
                setWallStart(null);
                setMeasure({ from: null, to: null });
              }}
            />
          ))}
      </div>
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <Button
          size="sm"
          icon="minus"
          iconOnly
          label={t("map.zoomOut")}
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
        />
        <span className="w-12 text-center text-[13px] text-ink-muted tabular-nums">
          {t("map.zoom", { percent: Math.round(zoom * 100) })}
        </span>
        <Button
          size="sm"
          icon="plus"
          iconOnly
          label={t("map.zoomIn")}
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
        />
      </div>
      {(hint || reasons || distance.data !== undefined) && (
        <div className="pointer-events-none absolute top-2 left-14 z-10 max-w-[70%] space-y-1">
          {hint && (
            <div className="rounded bg-card/90 px-2 py-1 text-[13px] text-ink-muted">{hint}</div>
          )}
          {ui.tool === "measure" && measure.to && distance.data !== undefined && (
            <div className="rounded bg-card/90 px-2 py-1 font-bold text-ink">
              {t("map.distance", { feet: distance.data })}
            </div>
          )}
          {reasons && <Reasons reasons={reasons} className="pointer-events-auto" />}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <svg
          data-map
          width={width * CELL * zoom}
          height={height * CELL * zoom}
          viewBox={`${bounds.minX * CELL} ${bounds.minY * CELL} ${width * CELL} ${height * CELL}`}
          className={cx(
            "block select-none",
            ui.aiming || ui.tool !== "select" ? "cursor-crosshair" : "cursor-default",
          )}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            painting.current = ["difficult", "blocked", "clear"].includes(ui.tool);
            onSquare(squareAt(e), e);
          }}
          onPointerMove={(e) => {
            const sq = squareAt(e);
            if (!hover || hover.x !== sq.x || hover.y !== sq.y) {
              setHover(sq);
              if (painting.current && e.buttons === 1) onSquare(sq, e);
            }
          }}
          onPointerUp={() => {
            painting.current = false;
          }}
          onPointerLeave={() => {
            painting.current = false;
            setHover(null);
          }}
        >
          <title>{t("map.label")}</title>
          <defs>
            <pattern id="grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
              <path
                d={`M ${CELL} 0 L 0 0 0 ${CELL}`}
                fill="none"
                className="stroke-grid"
                strokeWidth={1}
              />
            </pattern>
            <pattern
              id="hatch"
              width={8}
              height={8}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={8}
                className="stroke-ink-faint"
                strokeWidth={2}
                opacity={0.6}
              />
            </pattern>
          </defs>
          <rect
            x={bounds.minX * CELL}
            y={bounds.minY * CELL}
            width={width * CELL}
            height={height * CELL}
            fill="url(#grid)"
          />

          {difficult.map((sq) => (
            <rect
              key={`d${sq.x},${sq.y}`}
              x={sq.x * CELL}
              y={sq.y * CELL}
              width={CELL}
              height={CELL}
              fill="url(#hatch)"
            />
          ))}
          {blocked.map((sq) => (
            <rect
              key={`b${sq.x},${sq.y}`}
              x={sq.x * CELL}
              y={sq.y * CELL}
              width={CELL}
              height={CELL}
              className="fill-ink/80 stroke-ink"
            />
          ))}

          {view.zones.map((z) => (
            <g key={z.id} aria-label={z.label}>
              {z.squares.map(parse).map((sq) => (
                <rect
                  key={`${sq.x},${sq.y}`}
                  x={sq.x * CELL}
                  y={sq.y * CELL}
                  width={CELL}
                  height={CELL}
                  className={
                    z.difficult
                      ? "fill-purple/25 stroke-purple/60"
                      : "fill-purple/15 stroke-purple/60"
                  }
                  strokeWidth={1}
                />
              ))}
              {z.segments.map((seg) => (
                <line
                  key={`${seg.from.x},${seg.from.y}-${seg.to.x},${seg.to.y}`}
                  x1={seg.from.x * CELL}
                  y1={seg.from.y * CELL}
                  x2={seg.to.x * CELL}
                  y2={seg.to.y * CELL}
                  className="stroke-purple"
                  strokeWidth={6}
                  strokeLinecap="round"
                />
              ))}
              {z.squares[0] && (
                <text
                  x={parse(z.squares[0]).x * CELL + 4}
                  y={parse(z.squares[0]).y * CELL + 14}
                  className="fill-purple"
                  fontSize={13}
                  fontWeight={700}
                >
                  {z.label}
                </text>
              )}
            </g>
          ))}

          {highlight.map((sq) => (
            <rect
              key={`h${sq.x},${sq.y}`}
              x={sq.x * CELL}
              y={sq.y * CELL}
              width={CELL}
              height={CELL}
              className={ui.aiming ? "fill-red/20 stroke-red" : "fill-blue/10 stroke-none"}
            />
          ))}

          {moving &&
            [...reachableSet].map((key) => {
              const sq = parse(key);
              return (
                <rect
                  key={`r${key}`}
                  x={sq.x * CELL}
                  y={sq.y * CELL}
                  width={CELL}
                  height={CELL}
                  className="fill-green/15 stroke-green/50"
                  pointerEvents="none"
                />
              );
            })}
          {moving &&
            movePreview.data &&
            movePreview.data.path.length > 0 &&
            selectedForMove?.position && (
              <polyline
                points={[selectedForMove.position, ...movePreview.data.path]
                  .map((p) => `${(p.x + 0.5) * CELL},${(p.y + 0.5) * CELL}`)
                  .join(" ")}
                fill="none"
                className={movePreview.data.ok ? "stroke-green" : "stroke-red"}
                strokeWidth={3}
                strokeDasharray="6 4"
                pointerEvents="none"
              />
            )}

          {hover && (ui.tool !== "select" || ui.aiming) && (
            <rect
              x={hover.x * CELL}
              y={hover.y * CELL}
              width={CELL}
              height={CELL}
              fill="none"
              className="stroke-ink"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          )}

          {encounter.map.walls.map((w) => (
            <line
              key={`w${w.from.x},${w.from.y},${w.to.x},${w.to.y}`}
              x1={w.from.x * CELL}
              y1={w.from.y * CELL}
              x2={w.to.x * CELL}
              y2={w.to.y * CELL}
              strokeWidth={6}
              strokeLinecap="round"
              className={cx("stroke-ink", gm && ui.tool === "walls" && "cursor-pointer")}
              onPointerDown={(e) => {
                if (gm && ui.tool === "walls") {
                  e.stopPropagation();
                  setWallStart(null);
                  void act({ type: "remove_wall", from: w.from, to: w.to });
                }
              }}
            />
          ))}
          {wallStart && (
            <circle
              cx={wallStart.x * CELL}
              cy={wallStart.y * CELL}
              r={6}
              className="fill-hl stroke-ink"
            />
          )}

          {measure.from && (
            <MeasureLine
              from={measure.from}
              to={measure.to ?? hover}
              feet={measure.to ? distance.data : undefined}
            />
          )}

          {view.combatants
            .filter((c) => c.position)
            .map((c) => (
              <Token
                key={c.id}
                c={c}
                current={view.current === c.id}
                selected={ui.selected === c.id}
                candidate={candidates.has(c.id)}
                allied={allies.has(c.side)}
                onActivate={() => {
                  // Aiming at a creature aims at its square.
                  if (ui.aiming && c.position) ui.aiming.onPick(c.position);
                  else if (ui.onToken) ui.onToken(c.id);
                  else if (
                    !ui.aiming &&
                    (ui.tool === "select" || ui.tool === "move" || ui.tool === "place")
                  )
                    ui.select(c.id);
                }}
              />
            ))}

          {ui.ping && (
            <g pointerEvents="none">
              <circle
                cx={(ui.ping.x + 0.5) * CELL}
                cy={(ui.ping.y + 0.5) * CELL}
                r={CELL * 0.8}
                fill="none"
                className="stroke-ink"
                strokeWidth={3}
              >
                <animate
                  attributeName="r"
                  from={CELL * 0.2}
                  to={CELL * 1.2}
                  dur="1s"
                  repeatCount="3"
                />
                <animate attributeName="opacity" from={1} to={0} dur="1s" repeatCount="3" />
              </circle>
            </g>
          )}
        </svg>
      </div>
      <UnplacedTokens view={view} />
    </section>
  );
}

function MeasureLine({
  from,
  to,
  feet,
}: {
  from: Square;
  to: Square | null;
  feet: number | undefined;
}) {
  if (!to) return null;
  const c = (v: number) => (v + 0.5) * CELL;
  return (
    <g pointerEvents="none">
      <line
        x1={c(from.x)}
        y1={c(from.y)}
        x2={c(to.x)}
        y2={c(to.y)}
        className="stroke-ink"
        strokeWidth={3}
        strokeDasharray="8 5"
      />
      {feet !== undefined && (
        <text
          x={c(to.x) + 10}
          y={c(to.y) - 10}
          className="fill-ink stroke-card"
          strokeWidth={4}
          paintOrder="stroke"
          fontSize={16}
          fontWeight={700}
        >
          {feet} ft
        </text>
      )}
    </g>
  );
}

function Token({
  c,
  current,
  selected,
  candidate,
  allied,
  onActivate,
}: {
  c: CombatantView;
  current: boolean;
  selected: boolean;
  candidate: boolean;
  /** On one of the party's sides: a blue rim, red otherwise. */
  allied: boolean;
  onActivate: () => void;
}) {
  if (!c.position) return null;
  const size = c.space * CELL;
  const x = c.position.x * CELL;
  const y = c.position.y * CELL;
  const r = size / 2 - 4;
  const down = c.defeated || c.dead;
  const initials = c.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const sizeLetter =
    c.size && !["medium", "small", "tiny"].includes(c.size) ? c.size[0]?.toUpperCase() : null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: an SVG token can't be a <button>
    <g
      role="button"
      tabIndex={0}
      aria-label={`${c.name}${selected ? " (selected)" : ""}`}
      aria-pressed={selected}
      onPointerDown={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-focus"
      opacity={down ? 0.45 : 1}
    >
      <circle
        cx={x + size / 2}
        cy={y + size / 2}
        r={r + 3}
        fill="none"
        className={
          selected
            ? "stroke-blue"
            : candidate
              ? "stroke-red"
              : current
                ? "stroke-hl"
                : "stroke-none"
        }
        strokeWidth={current && !selected && !candidate ? 5 : 2.5}
        strokeDasharray={candidate && !selected ? "5 3" : undefined}
      />
      <circle
        cx={x + size / 2}
        cy={y + size / 2}
        r={r - 1}
        className={cx("fill-card", allied ? "stroke-blue" : "stroke-red")}
        strokeWidth={3.5}
      />
      <text
        x={x + size / 2}
        y={y + size / 2 + 5}
        textAnchor="middle"
        className="fill-ink"
        fontSize={Math.max(12, r * 0.7)}
        fontWeight={700}
        pointerEvents="none"
      >
        {initials}
      </text>
      {sizeLetter && (
        <text
          x={x + size - 8}
          y={y + 12}
          textAnchor="end"
          className="fill-ink"
          fontSize={13}
          fontWeight={700}
          pointerEvents="none"
        >
          {sizeLetter}
        </text>
      )}
      {c.conditions.length > 0 && (
        <circle
          cx={x + 8}
          cy={y + 8}
          r={5}
          fill="none"
          className="stroke-orange"
          strokeWidth={3}
          pointerEvents="none"
        />
      )}
      {down && (
        <g pointerEvents="none">
          <line
            x1={x + 8}
            y1={y + 8}
            x2={x + size - 8}
            y2={y + size - 8}
            className="stroke-red"
            strokeWidth={3}
          />
          <line
            x1={x + size - 8}
            y1={y + 8}
            x2={x + 8}
            y2={y + size - 8}
            className="stroke-red"
            strokeWidth={3}
          />
        </g>
      )}
      <title>{c.name}</title>
    </g>
  );
}

/** Combatants not on the map yet: pick one, then the Place tool puts it on a square. */
function UnplacedTokens({ view }: { view: EncounterView }) {
  const select = useTableUi((s) => s.select);
  const selected = useTableUi((s) => s.selected);
  const unplaced = view.combatants.filter((c) => !c.position);
  if (!unplaced.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-edge bg-card/80 px-2 py-1">
      <span className="text-[13px] text-ink-muted">{t("table.unpositioned")}:</span>
      {unplaced.map((c) => (
        <Button key={c.id} size="sm" on={selected === c.id} onClick={() => select(c.id)}>
          <Icon name={c.character ? "user" : "skull"} size={14} />
          {c.name}
        </Button>
      ))}
    </div>
  );
}
