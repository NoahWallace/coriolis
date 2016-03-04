
/**
 * Filter eligble modules based on parameters
 * @param  {Array}  arr       Available modules array
 * @param  {number} maxClass  Max class
 * @param  {number} minClass  Minimum class
 * @param  {number} mass      Mass
 * @return {Array}            Fitlered module subset
 */
function filter(arr, maxClass, minClass, mass) {
  return arr.filter(m => m.class <= maxClass && m.class >= minClass && (m.maxmass === undefined || mass <= m.maxmass));
}

/**
 * The available module set for a specific ship
 */
export default class ModuleSet {

  /**
   * Instantiate the module set
   * @param  {Object} modules        All Modules
   * @param  {number} mass           Ship mass
   * @param  {Array}  maxStandardArr Array of standard slots classes/sizes
   * @param  {Array}  maxInternal    Array of internal slots classes/sizes
   * @param  {Array}  maxHardPoint   Array of hardpoint slots classes/sizes
   */
  constructor(modules, mass, maxStandardArr, maxInternal, maxHardPoint) {
    let stnd = modules.standard;
    this.mass = mass;
    this.standard = {};
    this.internal = {};
    this.hardpoints = {};
    this.hpClass = {};
    this.intClass = {};

    this.standard[0] = filter(stnd.pp, maxStandardArr[0], 0, mass);  // Power Plant
    this.standard[2] = filter(stnd.fsd, maxStandardArr[2], 0, mass);  // FSD
    this.standard[4] = filter(stnd.pd, maxStandardArr[4], 0, mass);  // Power Distributor
    this.standard[6] = filter(stnd.ft, maxStandardArr[6], 0, mass);  // Fuel Tank
    // Thrusters, filter modules by class only (to show full list of ratings for that class)
    let minThrusterClass = stnd.t.reduce((clazz, th) => (th.maxmass >= mass && th.class < clazz) ? th.class : clazz, maxStandardArr[1]);
    this.standard[1] = filter(stnd.t, maxStandardArr[1], minThrusterClass, 0);  // Thrusters
    // Slots where module class must be equal to slot class
    this.standard[3] = filter(stnd.ls, maxStandardArr[3], maxStandardArr[3], 0);     // Life Supprt
    this.standard[5] = filter(stnd.s, maxStandardArr[5], maxStandardArr[5], mass);  // Sensors

    for (let h in modules.hardpoints) {
      this.hardpoints[h] = filter(modules.hardpoints[h], maxHardPoint, 0, mass);
    }

    for (let g in modules.internal) {
      this.internal[g] = filter(modules.internal[g], maxInternal, 0, mass);
    }
  }

  /**
   * Determine the modules that areeligible for an internal slot
   * @param  {integer} c        The max class module that can be mounted in the slot
   * @param  {Object} eligible) The map of eligible internal groups
   * @return {object}           A map of all eligible modules by group
   */
  getInts(c, eligible) {
    let o = {};
    for (let key in this.internal) {
      if (eligible && !eligible[key]) {
        continue;
      }
      let data = filter(this.internal[key], c, 0, this.mass);
      if (data.length) {  // If group is not empty
        o[key] = data;
      }
    }
    return o;
  }

  /**
   * Determining the modules that are eligible for an hardpoint slot
   * @param  {integer} c        The max class module that can be mounted in the slot
   * @param  {Object} eligible) The map of eligible hardpoint groups
   * @return {object}           A map of all eligible modules by group
   */
  getHps(c, eligible) {
    let o = {};
    for (let key in this.hardpoints) {
      if (eligible && !eligible[key]) {
        continue;
      }
      let data = filter(this.hardpoints[key], c, c ? 1 : 0, this.mass);
      if (data.length) {  // If group is not empty
        o[key] = data;
      }
    }
    return o;
  }

  /**
   * Find the lightest Power Distributor that provides sufficient
   * energy to boost.
   * @param  {number} boostEnergy [description]
   * @return {Object}             Power Distributor
   */
  lightestPowerDist(boostEnergy) {
    let pd = this.standard[4][0];

    for (let p of this.standard[4]) {
      if (p.mass < pd.mass && p.enginecapacity >= boostEnergy) {
        pd = p;
      }
    }
    return pd;
  };

  /**
   * Finds the lightest Thruster that can handle the specified tonnage
   * @param  {number} ladenMass Ship laden mass (mass + cargo + fuel)
   * @return {Object}           Thruster
   */
  lightestThruster(ladenMass) {
    let th = this.standard[1][0];

    for (let t of this.standard[1]) {
      if (t.mass < th.mass && t.maxmass >= ladenMass) {
        th = t;
      }
    }
    return th;
  };

  /**
   * Finds the lightest usable Shield Generator
   * @param  {number} hullMass  Ship hull mass
   * @return {Object}           Thruster
   */
  lightestShieldGenerator(hullMass) {
    let sg = this.internal.sg[0];

    for (let s of this.internal.sg) {
      if (s.mass < sg.mass && s.minmass <= hullMass && s.maxmass > hullMass) {
        sg = s;
      }
    }
    return sg;
  };

  /**
   * Find the lightest Power Plant that provides sufficient power
   * @param  {number} powerNeeded Power requirements in MJ
   * @return {Object}             Power Plant
   */
  lightestPowerPlant(powerNeeded) {
    let pp = this.standard[0][0];

    for (let p of this.standard[0]) {
      // Provides enough power, is lighter or the same mass as current power plant but better output/efficiency
      if (p.pGen >= powerNeeded && (p.mass < pp.mass || (p.mass == pp.mass && p.pGen > pp.pGen))) {
        pp = p;
      }
    }
    return pp;
  }
}