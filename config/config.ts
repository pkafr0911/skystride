import { defineConfig } from "@umijs/max";

const pages = process.env.REACT_APP_ENV === "pre";
export default defineConfig({
  title: "Skystride — Parkour in Motion",
  hash: true,
  base: pages ? "/skystride/" : "/",
  publicPath: pages ? "/skystride/" : "/",
  routes: [{ path: "/", component: "./Skystride", layout: false }],
  antd: {},
  fastRefresh: true,
  mako: {},
  theme: { "root-entry-name": "variable", "primary-color": "#ffbe83" },
  metas: [
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1, viewport-fit=cover",
    },
    { name: "theme-color", content: "#172638" },
    {
      name: "description",
      content:
        "Race sunset rooftops. Master parkour routes. Chase your personal best.",
    },
  ],
});
