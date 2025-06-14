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
	constructor(element, dx = 0, dy = 0) {
		this._element = element;
		this.dx = dx;
		this.dy = dy;
	}

	get element() {
		return this._element;
	}
}

/** @type {Set<HTMLElement>} */
let animationParents = new Set();
/** @type {Set<HTMLElement>} */
const draggedElements = new Set();
/** @type {Ani[]} */
let animated = [];
/** @type {Map<HTMLElement, Ani>} */
const aniMap = new Map();
/** @type {Set<HTMLElement>} */
const aniTouch = new Set();
/** @type {MouseEvent} */
let lastEvent;
let ldx, ldy, pdx, pdy, lt;
/** @type {number} */
let zoom = 1/(window.devicePixelRatio || 1);

document.addEventListener("mousemove", event => {
	pdx = ldx;
	pdy = ldy;
	ldx = event.movementX;
	ldy = event.movementY;
	lastEvent = event;

	for (const k of draggedElements) {
		const r = reversiClamp(new Ani(k, ldx, ldy), k, ldx, ldy);
		bump(k, r[0], r[1]);
	}
});

/**
 * @param {number} pos
 * @param {number} length
 * @param {number} windowLength
 */
function correctDelta(pos, length, windowLength) {
	const a = pos + length;
	return pos < 0 ? -pos : a > windowLength ? windowLength - a : 0;
}

/**
 * @param {HTMLElement} element
 * @param {number} dx
 * @param {number} dy
 */
function bump(element, dx, dy) {
	const style = element.style;

	const cx = (+style.getPropertyValue("--dx") || 0) + dx;
	const cy = (+style.getPropertyValue("--dy") || 0) + dy;

	style.setProperty("--dx", cx);
	style.setProperty("--dy", cy);
}

window.addEventListener("resize", (_) => {
	zoom = 1/(window.devicePixelRatio || 1);
	console.log(window.devicePixelRatio, window.innerWidth, window.innerHeight);

	for (const parent of animationParents) {
		for (const child of parent.childNodes) {
			const b = child.getBoundingClientRect();

			const dx = correctDelta(b.x, b.width, window.innerWidth);
			const dy = correctDelta(b.y, b.height, window.innerHeight);

			if (dx || dy) {
				bump(child, dx, dy);
				animate(child, dx, dy, 0.75);
			}
		}
	}
})

/**
 * @param {Ani} ani
 * @param {HTMLElement} move
 * @param {number} dx
 * @param {number} dy
 * @param {number} cx
 * @param {number} cy
 * @returns {number[]}
 */
function reversiClamp(ani, move, dx, dy) {
	const z = window.devicePixelRatio;
	const b = move.getBoundingClientRect();

	const cdx = correctDelta(dx * zoom + b.x, b.width, window.innerWidth);
	const cdy = correctDelta(dy * zoom + b.y, b.height, window.innerHeight);

	if (cdx) {
		dx += cdx * z;
		ani.dx = Math.sign(cdx) * Math.abs(ani.dx * 0.75);
	}

	if (cdy) {
		dy += cdy * z;
		ani.dy = Math.sign(cdy) * Math.abs(ani.dy * 0.75);
	}

	return [dx, dy];
}

const fifteenth = 1/15;
// 1 / 1000 / fifteenth
const stepMul = 0.015;

function tick(timestamp) {
	// Clamp it to 1 at most; deltas larger than 1 would require sprinting
	const step = Math.min((timestamp - lt) * stepMul, 1);
	const halfStep = step * 0.5;

	aniTouch.clear();

	animated = animated.filter((ani) => {
		if (!ani) {
			return false;
		}

		const element = ani.element;

		if (element.dataset.dragged === "true") {
			aniMap.delete(element);
			return false;
		}

		const w = +(element.getAttribute("width") || 1);
		const h = +(element.getAttribute("height") || 1);

		const adx = ani.dx, sdx = Math.sign(adx);
		const ady = ani.dy, sdy = Math.sign(ady);

		const c = (1 / (0.5 * w * h)) * fifteenth;

		const ddx = (sdx * adx * adx * c) + (adx * 0.15 * fifteenth);
		const ddy = (sdy * ady * ady * c) + (ady * 0.15 * fifteenth);

		ani.dx -= ddx * step;
		ani.dy -= ddy * step;

		if(!isFinite(ani.dx) || ani.dx * adx < 0) { ani.dx = 0; }
		if(!isFinite(ani.dy) || ani.dy * ady < 0) { ani.dy = 0; }

		let r = reversiClamp(ani, element,
			(adx + ani.dx) * halfStep,
			(ady + ani.dy) * halfStep,
		);

		bump(element, r[0], r[1]);

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
 * @param {number} c constant multiplier
 */
function animate(element, dx, dy, c) {
	if (aniTouch.has(element)) {
		return;
	}
	aniTouch.add(element);
/*
	const w = +(element.getAttribute("width") || 1);
	const h = +(element.getAttribute("height") || 1);

	const c = 1 / (0.015 * w * h);
*/

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

function getTarget(event) {
	/** @type {HTMLElement} */
	const target = event.target;

	if (target.tagName === "svg") {
		return undefined;
	}

	if (animationParents.has(target)) {
		return undefined;
	}

	return findSvgElseSelf(target);
}

/**
 * @param {MouseEvent} event
 */
export function mouseover(event) {
	const target = getTarget(event);

	if (target) {
		animate(findSvgElseSelf(target), ldx, ldy, 0.25);
	}
}

/**
 * @param {MouseEvent} event
 */
export function mousedown(event) {
	const target = getTarget(event);

	if (target) {
		event.preventDefault();
		aniTouch.add(target);
		target.dataset.dragged = "true"
		draggedElements.add(target);
	}
}

/**
 * @param {MouseEvent} event
 */
export function mouseup(event) {
	const dx = pdx + ldx;
	const dy = pdy + ldy;

	const flag = animated.length == 0 && draggedElements.length != 0;

	const arr = [...draggedElements];
	draggedElements.clear();
	aniTouch.clear();
	for (const k of arr) {
		k.dataset.dragged = "false"
		animate(k, dx, dy, 1);
	}
	if (flag) {
		requestAnimationFrame(tick);
	}
}

/** @param {HTMLElement} animate */
export default function(animate) {
	animate.dataset.animationParent = "true";
	animationParents.add(animate);
	animate.addEventListener("mouseover", mouseover);
	animate.addEventListener("mousemove", mouseover);
	animate.addEventListener("mousedown", mousedown);
}

window.addEventListener("mouseup", mouseup);
