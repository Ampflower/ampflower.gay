"use strict";

class Ani {
	/** 
	 * @private
	 * @readonly
	 * @type {HTMLElement}
	 */
	_element;
	/** @type {number} */
	dx;
	/** @type {number} */
	dy;

	/**
	 * @param {HTMLElement} element The element to animate
	 * @param {number} dx The delta of X
	 * @param {number} dy The delta of Y
	 */
	constructor(element, dx, dy) {
		this._element = element;
		this.dx = dx;
		this.dy = dy;
	}

	get element() {
		return this._element;
	}
}

/** @type {Ani[]} */
let animated = [];
/** @type {Map<HTMLElement, Ani>} */
const aniMap = new Map();
/** @type {Set<HTMLElement>} */
const aniTouch = new Set();
/** @type {MouseEvent} */
let lastEvent;
let ldx, ldy, lt;

document.addEventListener("mousemove", event => {
	ldx = event.movementX;
	ldy = event.movementY;
	lastEvent = event
});

/**
 * @param {Ani} ani
 * @param {HTMLElement} root
 * @param {HTMLElement} move
 * @param {number} dx
 * @param {number} dy
 * @returns {number[]}
 */
function reversiClamp(ani, root, move, dx, dy) {
	
	const w = window.innerWidth;
	const h = window.innerHeight;

	/** @type {HTMLElement} */
	const c = move.firstChild || move;

	const b = c.getBoundingClientRect();

	if (b.x < 0) {
		dx -= b.x;
		ani.dx = ani.dx * -0.75;
	}
	if(b.y < 0) {
		dy -= b.y;
		ani.dy = ani.dy * -0.75;
	}

	const ddx = b.x + b.width;
	if(ddx > w) {
		dx += w - ddx;
		ani.dx = ani.dx * -0.75;
	}
	const ddy = b.y + b.height;
	if (ddy > h) {
		dy += h - ddy;
		ani.dy = ani.dy * -0.75;
	}

	return [dx, dy];
}

function tick(timestamp) {
	const step = ((timestamp - lt) / 1000);
	lt = timestamp;

	aniTouch.clear();

	animated = animated.filter((ani) => {
		if (!ani) {
			return false;
		}

		const element = ani.element;
		
		const w = +(element.getAttribute("width") || 1);
		const h = +(element.getAttribute("height") || 1);

		const c = (1 / (0.00015 * w * h)) * step;

		const ldx = ani.dx * 0.15 * step;
		const ldy = ani.dy * 0.15 * step;

		const ddx = (Math.sign(ani.dx) * ani.dx * ani.dx * c) + ldx;
		const ddy = (Math.sign(ani.dy) * ani.dy * ani.dy * c) + ldy;

		ani.dx -= ddx;
		ani.dy -= ddy;

		if(!isFinite(ani.dx)) { ani.dx = 0; }
		if(!isFinite(ani.dy)) { ani.dy = 0; }

		const style = element.style;

		const cx = (+style.getPropertyValue("--dx") || 0) + ani.dx;
		const cy = (+style.getPropertyValue("--dy") || 0) + ani.dy;

		let r = reversiClamp(ani, document, element, cx, cy);

		style.setProperty("--dx", r[0]);
		style.setProperty("--dy", r[1]);

		if (Math.abs(ani.dx) < 0.01 && Math.abs(ani.dy) < 0.01) {
			aniMap.delete(element);
			return false;
		}
		return true;
	});

	if (animated.length != 0) {
		requestAnimationFrame(tick);
	}
}

/**
 * @param {HTMLElement} element
 * @param {number} dx
 * @param {number} dy
 */
function animate(element, dx, dy) {
	if (aniTouch.has(element)) {
		return;
	}
	aniTouch.add(element);
/*
	const w = +(element.getAttribute("width") || 1);
	const h = +(element.getAttribute("height") || 1);

	const c = 1 / (0.015 * w * h);
*/
	const c = 0.25;

	dx *= c;
	dy *= c;

	const ani = aniMap.get(element);

	if (ani) {
		if (Math.abs(dx) > 0.5) { ani.dx += dx; }
		if (Math.abs(dy) > 0.5) { ani.dy += dy; }
		return;
	}

	animated.push(new Ani(element, dx, dy));
	
	if (animated.length == 1) {
		lt = document.timeline.currentTime;
		requestAnimationFrame(tick);
	}
}

/** @param {HTMLElement} element */
function findSvgElseSelf(element) {
	const self = element;

	while (element && element != document && element.dataset.animationParent !== "true") {
		element = element.parentNode;

		if(element.tagName === "svg") {
			return element;
		}
	}

	return self;
}

/**
 * @param {MouseEvent} event
 */
export function mouseover(event) {
	console.trace("got", event);
	
	/** @type {HTMLElement} */
	const target = event.target;

	if (target.tagName === "svg") {
		return;
	}

	if (target.dataset.animationParent === "true") {
		return;
	}

	animate(findSvgElseSelf(target), ldx, ldy);
}

/** @param {HTMLElement} animate */
export default function(animate) {
	animate.dataset.animationParent = "true";
	animate.addEventListener("mouseover", mouseover);
	animate.addEventListener("mousemove", mouseover);
}