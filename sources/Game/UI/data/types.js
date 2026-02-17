/**
 * @typedef {Object} POI
 * @property {[number, number, number]} cameraPosition
 * @property {[number, number, number]} targetPosition
 * @property {number} [distance]
 * @property {number} [azimuthDeg]
 * @property {number} [elevationDeg]
 */

/**
 * @typedef {Object} POICamera
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {[number, number, number]} cameraPosition
 * @property {[number, number, number]} targetPosition
 * @property {string} description
 * @property {number} [distance]
 * @property {number} [azimuthDeg]
 * @property {number} [elevationDeg]
 */

/**
 * @typedef {Object} Zone
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {[number, number, number]} position
 * @property {string} description
 * @property {'conference'|'exhibition'|'food'|'registration'|'lounge'|'other'} type
 * @property {POI} [poi]
 * @property {string} [floor]
 * @property {string[]} [equipment]
 * @property {number} [capacity]
 */

/**
 * @typedef {Object} Event
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} zoneId
 * @property {Date} startTime
 * @property {Date} endTime
 * @property {'upcoming'|'ongoing'|'completed'} status
 * @property {string[]} tags
 * @property {string[]} [speakers]
 * @property {number} [capacity]
 */

/**
 * @typedef {Object} UserLocation
 * @property {[number, number, number]} position
 * @property {number} rotation
 * @property {Date} timestamp
 */

/**
 * @typedef {Object} Friend
 * @property {string} id
 * @property {string} name
 * @property {string} [avatar]
 * @property {UserLocation} location
 * @property {boolean} isOnline
 */

/**
 * @typedef {Object} Route
 * @property {[number, number, number]} from
 * @property {[number, number, number]} to
 * @property {[number, number, number][]} waypoints
 * @property {number} distance
 * @property {number} estimatedTime
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {'event'|'navigation'|'friend'|'general'} type
 * @property {string} title
 * @property {string} message
 * @property {Date} timestamp
 * @property {string} [eventId]
 * @property {string} [zoneId]
 */

/**
 * @typedef {'top'|'angle'|'first-person'} ViewMode
 */

/**
 * @typedef {'events'|'zones'|'friends'|'favorites'|'menu'|'settings'|null} UIPanel
 */

export {}
