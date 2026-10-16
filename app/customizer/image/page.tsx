"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cart";
import { createClicker3mf, generateClickerModel, type ClickerModelOptions, type GeneratedClickerModel, type ImageClickerMode } from "@/lib/clickerModel";
import { useStoreSettings } from "@/lib/useStoreSettings";

function Mesh({ positions, color }: { positions: Float32Array; color: string }) {
  const geometry = useMemo(() => {
    const created = new THREE.BufferGeometry();
    created.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const welded = mergeVertices(created, 0.0001);
    created.dispose();
    welded.computeVertexNormals();
    return welded;
  }, [positions]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.55} /></mesh>;
}

function SwitchPreview({ x, y }: { x: number; y: number }) {
  return <group position={[x, y, 1.2]}>
    <mesh position={[0, 0, 5.8]} castShadow><boxGeometry args={[15.6, 15.6, 11.6]} /><meshStandardMaterial color="#252a31" roughness={0.7} /></mesh>
    <mesh position={[0, 0, 11.9]} castShadow><boxGeometry args={[13.4, 13.4, 1.2]} /><meshStandardMaterial color="#11151b" roughness={0.65} /></mesh>
    <mesh position={[0, 0, 14.1]} castShadow><boxGeometry args={[1.3, 4, 3.2]} /><meshStandardMaterial color="#171a20" /></mesh>
    <mesh position={[0, 0, 14.1]} castShadow><boxGeometry args={[4, 1.3, 3.2]} /><meshStandardMaterial color="#171a20" /></mesh>
  </group>;
}

export default function ImageClickerCustomizer() {
  const router = useRouter();
  const { clickerStartingPrice, imageClickerEnabled } = useStoreSettings();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImageClickerMode>("relief");
  const [options, setOptions] = useState<ClickerModelOptions>({ widthMm: 42, bodyHeightMm: 14, capHeightMm: 5, switchToleranceMm: 0.25, stemToleranceMm: 0.25, baseShape: "rounded", keychainLoop: true, buttonCount: 1 });
  const [bodyColor, setBodyColor] = useState("#f2f2f2");
  const [capColor, setCapColor] = useState("#ff7a1a");
  const [palette, setPalette] = useState<string[]>([]);
  const [exploded, setExploded] = useState(false);
  const [activePanel, setActivePanel] = useState<"shape" | "body" | "colors" | "switch" | "keychain" | "fit">("shape");
  const [model, setModel] = useState<GeneratedClickerModel | null>(null);
  const [preview, setPreview] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!file) { setModel(null); return; }
    setError(""); setModel(null);
    let active = true;
    const timer = window.setTimeout(() => {
      generateClickerModel(file, mode, options).then((result) => { if (active) { setModel(result); setPalette((current) => current.length === result.palette.length ? current : result.palette); } }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Gambar tidak dapat diproses."); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [file, mode, options]);
  async function addDesign() {
    if (!imageClickerEnabled) { setError("Fitur clicker dari gambar sedang dinonaktifkan oleh toko."); return; }
    if (!file || !model) return;
    setBusy(true); setError("");
    try {
      const printPalette = mode === "silhouette" ? palette.map(() => capColor) : palette;
      const form = new FormData(); form.set("image", file); form.set("model", createClicker3mf(model, bodyColor, printPalette), "clicker.3mf"); form.set("mode", mode);
      const response = await fetch("/api/clicker-designs", { method: "POST", body: form });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Desain gagal disimpan.");
      addToCart({ product: "clicker", name: `Clicker Gambar - ${file.name.replace(/\.[^.]+$/, "").slice(0, 36)}`, letters: ["GAMBAR"], baseColor: bodyColor, capColors: {}, fontColors: {}, price: clickerStartingPrice, quantity, clickerDesignId: result.designId, clickerDesignMode: mode, clickerDesignSettings: JSON.stringify({ ...options, mode, bodyColor, capColor, palette }) });
      router.push("/cart");
    } catch (e) { setError(e instanceof Error ? e.message : "Desain gagal disimpan."); setBusy(false); }
  }
  if (!imageClickerEnabled) return <main className="grid min-h-[60vh] place-items-center px-5 text-center"><div><h1 className="text-3xl font-black">Clicker dari gambar sedang tidak tersedia</h1><p className="mt-2 text-zinc-500">Fitur ini sementara dinonaktifkan oleh toko.</p><Link href="/" className="mt-5 inline-block font-bold text-orange-600">Kembali ke toko</Link></div></main>;
  return <main className="min-h-screen bg-[#faf9f7] px-5 py-10 text-zinc-900"><div className="mx-auto max-w-6xl">
    <Link href="/customizer" className="text-sm font-bold text-orange-600">← Customizer nama</Link>
    <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-600">KEILAB • DESAIN DARI GAMBAR</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Buat Clicker dari Gambar</h1><p className="mt-2 text-zinc-600">Unggah gambar, lihat bentuk 3D, lalu kirim desain langsung bersama pesanan.</p></div><div className="rounded-2xl border bg-white px-5 py-3"><p className="text-xs text-zinc-500">Harga awal</p><b>Rp{clickerStartingPrice.toLocaleString("id-ID")}</b></div></div>
    <div className="mt-7 grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border bg-white p-5">
      <label className="block text-sm font-bold">Pilih gambar (PNG, JPG, atau WebP; maksimal 5 MB)</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const next = e.target.files?.[0] ?? null; if (next && next.size > 5 * 1024 * 1024) { setError("Ukuran gambar maksimal 5 MB."); e.target.value = ""; return; } setPalette([]); setFile(next); }} className="mt-3 block w-full rounded-xl border p-3 text-sm" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{([{id:"relief",title:"Mode warna",desc:"Bagi gambar menjadi hingga empat area warna untuk dicetak multicolor."},{id:"silhouette",title:"Mode ekstrusi",desc:"Naikkan seluruh bentuk gambar menjadi satu siluet tombol."}] as const).map((item) => <button type="button" key={item.id} onClick={() => setMode(item.id)} className={`rounded-2xl border p-4 text-left ${mode === item.id ? "border-orange-500 bg-orange-50" : "border-zinc-200"}`}><b>{item.title}</b><p className="mt-1 text-xs text-zinc-500">{item.desc}</p></button>)}</div>
      <div className="mt-6 rounded-2xl border bg-white p-4">
        <div className="flex gap-2 overflow-x-auto border-b pb-3" aria-label="Panel editor clicker">
          {([['shape', 'Bentuk'], ['body', 'Badan'], ['colors', 'Warna'], ['switch', 'Switch'], ['keychain', 'Gantungan'], ['fit', 'Fit']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setActivePanel(id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${activePanel === id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}
        </div>
        <div className="pt-4">
          {activePanel === 'shape' && <><h2 className="font-black">Kontur & ukuran</h2><p className="mt-1 text-xs text-zinc-500">Kontur cap mengikuti PNG; badan berongga dilebarkan 2,2 mm untuk bibir dan jarak bebas.</p><label className="mt-4 block text-sm">Ukuran per tombol: <b>{options.widthMm} mm</b></label><input className="w-full accent-blue-600" type="range" min="28" max="52" value={options.widthMm} onChange={(e) => setOptions((o) => ({...o,widthMm:Number(e.target.value)}))}/><label className="mt-4 block text-sm">Jumlah tombol dalam satu badan</label><select className="mt-1 w-full rounded-lg border p-2" value={options.buttonCount} onChange={(e) => setOptions((o) => ({...o,buttonCount:Number(e.target.value)}))}><option value="1">1 tombol</option><option value="2">2 tombol</option><option value="3">3 tombol</option><option value="4">4 tombol</option></select></>}
          {activePanel === 'body' && <><h2 className="font-black">Badan & cap</h2><label className="mt-4 block text-sm">Tebal badan: <b>{options.bodyHeightMm} mm</b></label><input className="w-full accent-blue-600" type="range" min="13" max="20" value={options.bodyHeightMm} onChange={(e) => setOptions((o) => ({...o,bodyHeightMm:Number(e.target.value)}))}/><label className="mt-4 block text-sm">Tinggi cap/gambar: <b>{options.capHeightMm} mm</b></label><input className="w-full accent-blue-600" type="range" min="4" max="8" value={options.capHeightMm} onChange={(e) => setOptions((o) => ({...o,capHeightMm:Number(e.target.value)}))}/><div className="mt-5 flex gap-5"><label className="flex items-center gap-2 text-sm">Warna badan<input type="color" value={bodyColor} onChange={(e) => setBodyColor(e.target.value)}/></label><label className="flex items-center gap-2 text-sm">Warna cap<input type="color" value={capColor} onChange={(e) => setCapColor(e.target.value)}/></label></div></>}
          {activePanel === 'colors' && <><h2 className="font-black">Warna gambar</h2>{palette.length > 0 && mode === 'relief' ? <div className="mt-3 flex flex-wrap gap-3">{palette.map((value, index) => <label key={`${index}-${value}`} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">Area {index + 1}<input type="color" value={value} onChange={(e) => setPalette((colors) => colors.map((color, i) => i === index ? e.target.value : color))}/></label>)}</div> : <p className="mt-2 text-sm text-zinc-500">Pilih mode warna untuk mengubah warna area gambar.</p>}</>}
          {activePanel === 'switch' && <><h2 className="font-black">Dudukan Cherry MX</h2><p className="mt-2 text-sm text-zinc-600">Badan kini memiliki lantai tertutup dan rel dudukan di sekitar switch. Cap memakai boss bawah dengan soket silang.</p><label className="mt-4 block text-sm">Kelonggaran switch: <b>{options.switchToleranceMm.toFixed(2)} mm</b></label><input className="w-full accent-blue-600" type="range" min="0.1" max="0.6" step="0.05" value={options.switchToleranceMm} onChange={(e) => setOptions((o) => ({...o,switchToleranceMm:Number(e.target.value)}))}/><label className="mt-4 block text-sm">Kelonggaran stem cap: <b>{options.stemToleranceMm.toFixed(2)} mm</b></label><input className="w-full accent-blue-600" type="range" min="0.1" max="0.6" step="0.05" value={options.stemToleranceMm} onChange={(e) => setOptions((o) => ({...o,stemToleranceMm:Number(e.target.value)}))}/><p className="mt-3 text-xs text-zinc-500">Dimensi mengikuti rumah switch MX nominal; cetak uji tetap diperlukan untuk penyetelan printer.</p></>}
          {activePanel === 'keychain' && <><h2 className="font-black">Gantungan kunci</h2><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={options.keychainLoop} onChange={(e) => setOptions((o) => ({...o,keychainLoop:e.target.checked}))}/>Tambahkan loop gantungan</label></>}
          {activePanel === 'fit' && <><h2 className="font-black">Pemeriksaan pas</h2><p className="mt-2 text-sm text-zinc-600">Ukuran saat ini {options.widthMm} mm per tombol. Uji dudukan Cherry MX dan jarak cap sebelum produksi.</p></>}
        </div>
      </div>
      {preview && <div className="mt-5 flex items-center gap-4 rounded-2xl bg-zinc-50 p-3"><img src={preview} alt="Pratinjau gambar" className="h-20 w-20 rounded-xl object-contain"/><div className="text-sm"><b>{file?.name}</b><p className="text-zinc-500">Gambar akan disertakan pada order KEILAB.</p></div></div>}
      <label className="mt-6 block text-sm font-bold">Jumlah</label><div className="mt-2 inline-flex items-center rounded-xl border"><button className="px-4 py-2" onClick={() => setQuantity((q) => Math.max(1,q-1))}>−</button><span className="min-w-10 text-center">{quantity}</span><button className="px-4 py-2" onClick={() => setQuantity((q) => Math.min(20,q+1))}>+</button></div>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={!model || busy} onClick={addDesign} className="mt-5 w-full rounded-xl bg-orange-600 px-5 py-3 font-black text-white disabled:opacity-50">{busy ? "Menyimpan desain…" : `Tambah ke keranjang • Rp${(clickerStartingPrice * quantity).toLocaleString("id-ID")}`}</button>
      <p className="mt-3 text-xs leading-5 text-zinc-500">File 3MF tidak dapat diunduh customer; admin menerimanya bersama order. Ini prototipe rancangan untuk switch MX. Ukuran dudukan perlu dicetak uji dan disesuaikan dengan switch serta printer sebelum produksi.</p>
    </section><section className="overflow-hidden rounded-3xl border bg-zinc-100"><div className="aspect-square w-full max-h-[min(72vh,720px)]">{model ? <Canvas dpr={2} gl={{antialias:true}} camera={{position:[Math.max(170,options.widthMm*(options.buttonCount === 1 ? 2.6 : 3.6)),Math.max(240,options.widthMm*4),Math.max(380,options.widthMm*(options.buttonCount === 1 ? 9 : 10))],fov:42}}><ambientLight intensity={1.8}/><directionalLight position={[30,50,40]} intensity={2} castShadow/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.8,0]} receiveShadow><planeGeometry args={[256,256]}/><meshStandardMaterial color="#e1e5eb" roughness={0.95}/></mesh><Grid args={[256,256]} cellSize={16} sectionSize={64} fadeDistance={360} infiniteGrid={false} position={[0,-0.6,0]} cellColor="#bec5ce" sectionColor="#8e99a7"/><group rotation={[-Math.PI/2,0,0]}><Mesh positions={model.platePositions} color={bodyColor}/>{Array.from({length:options.buttonCount},(_,i)=>{const cols=options.buttonCount===1?1:2;const rows=Math.ceil(options.buttonCount/cols);return <SwitchPreview key={i} x={(i%cols+0.5)*options.widthMm-options.widthMm*cols/2} y={(Math.floor(i/cols)+0.5)*options.widthMm-options.widthMm*rows/2}/>})}<group position={[0,0,options.bodyHeightMm + (exploded ? 12 : 0)]}>{mode === "relief" ? model.capParts.map((positions, index) => <Mesh key={index} positions={positions} color={palette[index] ?? capColor}/>) : <Mesh positions={model.capPositions} color={capColor}/>}</group></group><OrbitControls enablePan mouseButtons={{LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE}}/></Canvas> : <p className="flex h-full items-center justify-center px-8 text-center text-sm text-zinc-500">{file ? "Membuat model 3D…" : "Unggah gambar untuk melihat pratinjau 3D."}</p>}</div><div className="flex items-center justify-between border-t bg-white p-4"><div><p className="text-sm font-semibold">Pratinjau {exploded ? "komponen terpisah" : "rakitan"} • Cherry MX</p><p className="text-xs text-zinc-500">Area cetak Bambu Lab X2D • 256 × 256 mm · geser kiri, putar kanan, scroll untuk zoom</p></div><button type="button" onClick={() => setExploded((v) => !v)} className="rounded-full border px-3 py-1.5 text-xs font-bold">{exploded ? "Rakit" : "Pisahkan komponen"}</button></div></section></div>
  </div></main>;
}
