// Randomly scatter hibiscus decorations.
// This could probably be moved to the backend, but I don't know enough jekyll to do that - Moxie

const imageSize = 32;
const container = document.getElementById("hibiscus-decorations");
const paths = [
	"/assets/svg/hibiscus.svg",
	"/assets/svg/hibiscus-blue.svg",
	"/assets/svg/hibiscus-white.svg"
];
const orthogonalSide = {
	top: "left",
	bottom: "left",
	left: "top",
	right: "top",
};

// Compute the width/height ratio of the main card, to
const card = document.querySelector(".card")?.getBoundingClientRect();
const width = card?.width ?? 0;
const height = card?.height ?? 0;
const heightRatio = height / width || 1;

const coordinates = [];

for (let n = 0; n < 25; n++) {
	for (let attempt = 0; attempt < 10; attempt++) {
		const vertical = Math.random() < heightRatio;
		const side = vertical ?
			(Math.random() < 0.5 ? "top" : "bottom")
			: (Math.random() < 0.5 ? "left" : "right");
		const orthogonalDistance = Math.random();
		const distance = Math.pow(orthogonalDistance * (1 - orthogonalDistance), 0.25) * Math.random() * 128 + imageSize * 1.5;

		// Rejection sampling to avoid collisions, by ensuring that they are at least sqrt(2)*imageSize apart from each other
		if (coordinates.find((other) => {
			// Ignore flowers that don't share the side
			if (other[0] !== side) return false;

			const dy = other[1] - distance;
			const dx = (other[2] - orthogonalDistance) * (vertical ? height : width);

			return dy * dy + dx * dx < imageSize * imageSize * 2;
		})) {
			continue;
		}

		coordinates.push([side, distance, orthogonalDistance]);
		break;
	}
}

for (const [side, distance, orthogonalDistance] of coordinates) {
	const element = document.createElement("img");

	element.src = paths[Math.floor(Math.random() * paths.length)];
	const size = imageSize * (0.5 * Math.random() + 0.5);
	element.width = size;
	element.height = size;
	element.className = `hibiscus-${side}`;
	element.style[side] = `-${distance}px`;
	element.style[orthogonalSide[side]] = `${orthogonalDistance * 90}%`;
	element.style.setProperty("--rotation", Math.floor(Math.random() * 4).toString());
	const duration = Math.random() * 2 + 2;
	element.style.setProperty("--duration", `${duration}s`);
	element.style.setProperty("--delay", `${-Math.random() * duration}s`);

	container.appendChild(element);
}
