# Simulasi Tumbukan 2 Bola 3D

Proyek ini dibuat dengan Vite dan Three.js untuk menampilkan simulasi dua bola yang bertumbukan pada satu lintasan.

## Fitur

- tumbukan lenting sempurna
- tumbukan lenting sebagian
- tumbukan tak lenting sama sekali
- efek menggelinding
- slider massa dan kecepatan awal
- vektor momentum
- label nilai massa, kecepatan, dan momentum
- siap deploy ke GitHub Pages dengan GitHub Actions

## Jalankan lokal

```bash
npm install
npm run dev
```

## Build produksi

```bash
npm run build
npm run preview
```

## Deploy ke GitHub Pages

1. Upload semua isi folder proyek ke repository GitHub.
2. Pastikan file `.github/workflows/deploy.yml` ikut terunggah.
3. Buka `Settings > Pages`.
4. Pada `Build and deployment`, pilih `GitHub Actions`.
5. Push ke branch `main` atau jalankan workflow manual dari tab `Actions`.
