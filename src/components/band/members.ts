export type BandMember = {
	id: string;
	name: string;
	role: string;
	photo: string;
	width: number;
	height: number;
	alt: string;
	position: string;
	mobilePosition: string;
	mobileScale: number;
};

// Identities follow the supplied filenames, not visual identification.
export const bandMembers: readonly BandMember[] = [
	{
		id: "joseph", name: "Joseph D'Folk", role: "Flauta y whistles",
		photo: "/images/banda/JOSEPH front.jpeg", width: 1280, height: 854,
		alt: "Joseph D'Folk, intérprete de flauta y whistles de Triskel, con su flauta en un sendero del bosque",
		position: "54% 50%", mobilePosition: "54% 26%", mobileScale: 1.2,
	},
	{
		id: "ismael", name: "Ismael Ros", role: "Guitarra",
		photo: "/images/banda/ISMA front.jpeg", width: 1280, height: 854,
		alt: "Ismael Ros, guitarrista de Triskel, con su guitarra en el bosque",
		position: "40% 50%", mobilePosition: "30% 0%", mobileScale: 1,
	},
	{
		id: "manuel", name: "Manuel Conesa", role: "Voz",
		photo: "/images/banda/MANU front.jpeg", width: 1280, height: 854,
		alt: "Manuel Conesa, vocalista de Triskel, con las manos juntas en el bosque",
		position: "50% 35%", mobilePosition: "49% 0%", mobileScale: 1,
	},
	{
		id: "alicia", name: "Alicia Trillo", role: "Violín",
		photo: "/images/banda/ALICIA sentada.jpeg", width: 1280, height: 854,
		alt: "Alicia Trillo, violinista de Triskel, sentada con su violín en el bosque",
		position: "34% 50%", mobilePosition: "32% 0%", mobileScale: 1,
	},
	{
		id: "mesi", name: "Vicente B. «Mesi»", role: "Guitarra",
		photo: "/images/banda/MESI front.jpeg", width: 1280, height: 854,
		alt: "Vicente B. «Mesi», guitarrista de Triskel, con su guitarra en el bosque",
		position: "52% 50%", mobilePosition: "62% 0%", mobileScale: 1,
	},
	{
		id: "fernando", name: "Fernando García", role: "Bajo",
		photo: "/images/banda/FERNANDO front.jpeg", width: 1600, height: 1067,
		alt: "Fernando García, bajista de Triskel, con su bajo en un sendero del bosque",
		position: "50% 50%", mobilePosition: "51% 20%", mobileScale: 1.08,
	},
	{
		id: "fatima", name: "Fátima G «Faty»", role: "Percusión",
		photo: "/images/banda/FATIMA front.jpeg", width: 1280, height: 854,
		alt: "Fátima G «Faty», percusionista de Triskel, retratada de pie en el bosque",
		position: "52% 20%", mobilePosition: "52% 0%", mobileScale: 1,
	},
];
