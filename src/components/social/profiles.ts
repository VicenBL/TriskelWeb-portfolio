export type SocialPlatform = "Spotify" | "Instagram" | "YouTube" | "TikTok" | "Apple Music" | "Facebook" | "SoundCloud";

export type SocialProfile = {
	name: SocialPlatform;
	href: `https://${string}`;
};

// Owner-provided destinations; this shared list is the only source for profile links.
export const socialProfiles: readonly SocialProfile[] = [
	{ name: "Spotify", href: "https://open.spotify.com/artist/6JBTLlRtcch06CANcHJkbm" },
	{ name: "Instagram", href: "https://www.instagram.com/triskelfolk/" },
	{ name: "YouTube", href: "https://www.youtube.com/@triskelfolkmetal" },
	{ name: "TikTok", href: "https://www.tiktok.com/@triskelfolk" },
	{ name: "Apple Music", href: "https://music.apple.com/es/artist/triskel/689227916" },
	{ name: "Facebook", href: "https://www.facebook.com/people/Triskel/61567356530778/" },
	{ name: "SoundCloud", href: "https://soundcloud.com/triskel-808082361" },
];
