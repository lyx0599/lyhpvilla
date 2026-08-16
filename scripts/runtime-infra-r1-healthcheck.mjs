#!/usr/bin/env node

const base = process.argv[2] || "http://127.0.0.1:3240/lyhpvilla";
const routes = [
  "/",
  "/preview/",
  "/2f-preview/",
  "/b1-preview/",
  "/b2-preview/",
  "/yard-preview/",
  "/owner-communication/",
];

let failed = false;
for (const route of routes) {
  const url = `${base.replace(/\/$/, "")}${route}`;
  const response = await fetch(url);
  const result = `${response.status} ${url}`;
  console.log(result);
  if (response.status !== 200) failed = true;
}

if (failed) process.exitCode = 1;
