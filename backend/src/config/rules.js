'use strict';

/**
 * Accepted recyclable materials and their point values.
 * Source of truth lives here until the database is wired.
 * Each entry will later be verified against the MySQL accepted_materials table.
 */
const ACCEPTED_MATERIALS = {
  plastic_bottle:  { label: 'Plastic Bottle',  points: 5  },
  plastic_waste:   { label: 'Plastic Waste',   points: 3  },
  glass_bottle:    { label: 'Glass Bottle',    points: 8  },
  glass:           { label: 'Glass',           points:  6  },
  can:             { label: 'Aluminum Can',    points: 7  },
  cardboard:       { label: 'Cardboard',       points: 4  },
};

/** Minimum ML confidence score required to accept a detection. */
const MIN_CONFIDENCE = 0.75;

/**
 * Rice pack sizes the vendo can dispense. Prices are not defined here; the
 * live `rice_pricing` table is the source of truth.
 */
const RICE_PACK_SIZES = ['1/4', '1/8', '1/2'];
const DEFAULT_RICE_PACK_SIZE = '1/4';

function isRicePackSize(code) {
  return RICE_PACK_SIZES.includes(code);
}

module.exports = {
  ACCEPTED_MATERIALS,
  MIN_CONFIDENCE,
  RICE_PACK_SIZES,
  DEFAULT_RICE_PACK_SIZE,
  isRicePackSize,
};
