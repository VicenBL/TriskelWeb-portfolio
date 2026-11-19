export type MusicRelease = {
	id: string;
	title: string;
	cover: { src: string; width: number; height: number };
	spotifyUrl?: `https://${string}`;
	youtubeUrl?: `https://${string}`;
};

// Display order only: no publication dates or chronology have been supplied.
export const releases: readonly MusicRelease[] = [
	{ id: "inquebrantable", title: "Inquebrantable", cover: { src: "/images/musica/INQUEBRANTABLE_portada.jpg", width: 1357, height: 1357 }, spotifyUrl: "https://open.spotify.com/album/2iGznw5oRPJmHmtGV7SzPC", youtubeUrl: "https://www.youtube.com/watch?v=j05EQAvMqNM" },
	{ id: "taberna", title: "La Taberna del Triskel", cover: { src: "/images/musica/TABERNA-portada-baja.jpg", width: 8496, height: 8500 }, spotifyUrl: "https://open.spotify.com/album/6qLIqFmQLRSxHFilCXb0Pc", youtubeUrl: "https://www.youtube.com/watch?v=7Rd9SnLs3h8" },
	{ id: "resaca", title: "Resaca en Alta Mar", cover: { src: "/images/musica/RESACA-portada.jpg", width: 1365, height: 1357 }, spotifyUrl: "https://open.spotify.com/album/7F8kSSBsrWMVD3LUwJpxxk", youtubeUrl: "https://www.youtube.com/watch?v=Dcy0iDUMlLg" },
	{ id: "arenas", title: "Arenas del Tiempo", cover: { src: "/images/musica/ARENAS-portada-alta.jpg", width: 1335, height: 1357 }, spotifyUrl: "https://open.spotify.com/album/0YbcMapiTAPAuF2drYtuAy", youtubeUrl: "https://www.youtube.com/watch?v=KQ8ah1VO6ig" },
];
