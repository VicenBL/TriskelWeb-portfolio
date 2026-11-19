import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	images: {
		localPatterns: [{ pathname: "/brand/triskel-simbolo.png", search: "" }],
	},
	async rewrites() {
		return { beforeFiles: [
			{ source: "/images/:path*", destination: "/api/preview/assets/images/:path*" },
			{ source: "/brand/:path*", destination: "/api/preview/assets/brand/:path*" },
		], afterFiles: [], fallback: [] };
	},
};

export default nextConfig;
