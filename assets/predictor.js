(function (global) {
  "use strict";
  const ZERO = () => [0, 0, 0, 0, 0, 0];
  function add(target, vector) {
    if (!vector) throw new Error("This option is missing from the model. Please choose again.");
    for (let k = 0; k < 6; k++) target[k] += vector[k];
  }
  function ageBand(age) {
    return age < 18 ? "15-17" : age < 25 ? "18-24" : age < 35 ? "25-34" :
      age < 45 ? "35-44" : age < 55 ? "45-54" : age < 65 ? "55-64" : age < 75 ? "65-74" : "75+";
  }
  function period(year) {
    return year <= 2009 ? "2005-2009" : year <= 2014 ? "2010-2014" : year <= 2019 ? "2015-2019" : "2021-2025";
  }
  function minutes(scores) {
    const maximum = Math.max(0, ...scores);
    const weights = scores.map(x => Math.exp(x - maximum));
    weights.push(Math.exp(-maximum));
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.map(x => x / total * 1440);
  }
  class LifestylePredictor {
    constructor(model) {
      this.model = model;
      this.calendarCache = new Map();
      this.cache = new Map();
    }
    validate(profile) {
      if (!this.model.years.includes(Number(profile.year))) throw new Error("Choose an available year from 2005–2025, excluding 2020.");
      if (profile.age !== null && profile.age !== "" && profile.age !== undefined &&
          (!Number.isInteger(Number(profile.age)) || Number(profile.age) < 15 || Number(profile.age) > 85)) {
        throw new Error("Age must be an integer from 15 to 85; 85 represents ages 85 and older.");
      }
      for (const key of [...this.model.demographics, "model_geography"]) {
        if (profile[key] && !this.model.effects[key][profile[key]]) throw new Error("This choice is outside the model coverage.");
      }
    }
    baseScores(profile) {
      const m = this.model, scores = [...m.intercept];
      const band = ageBand(Number(profile.age)), p = period(Number(profile.year));
      add(scores, m.ageEffects[String(profile.age)]);
      for (const key of m.demographics) {
        add(scores, m.effects[key][profile[key]]);
        add(scores, m.effects[key + "_by_period"][profile[key] + " | " + p]);
      }
      add(scores, m.effects.year[String(profile.year)]);
      add(scores, m.effects.age_band_by_period[band + " | " + p]);
      add(scores, m.effects.age_by_sex[band + " | " + profile.sex]);
      add(scores, m.effects.children_by_sex[profile.household_children + " | " + profile.sex]);
      add(scores, m.effects.model_geography[profile.model_geography]);
      return scores;
    }
    calendar(employment, dayType) {
      const cacheKey = employment + "/" + dayType;
      if (this.calendarCache.has(cacheKey)) return this.calendarCache.get(cacheKey);
      const m = this.model;
      const cells = m.referenceCalendar.filter(c => dayType === "all" ||
        (dayType === "weekday" ? c.day >= 2 && c.day <= 6 : c.day === 1 || c.day === 7));
      const total = cells.reduce((sum, c) => sum + c.weight, 0);
      const result = cells.map(c => {
        const score = ZERO();
        add(score, m.effects.diary_day[String(c.day)]);
        add(score, m.effects.month[String(c.month)]);
        add(score, m.effects.holiday[String(c.holiday)]);
        add(score, m.effects.day_by_employment[c.day + " | " + employment]);
        return { score, weight: c.weight / total };
      });
      this.calendarCache.set(cacheKey, result);
      return result;
    }
    predictDiary(profile) {
      this.validate(profile);
      const scores = this.baseScores(profile), m = this.model;
      add(scores, m.effects.diary_day[String(profile.tudiaryday)]);
      add(scores, m.effects.month[String(profile.tumonth)]);
      add(scores, m.effects.holiday[String(profile.trholiday)]);
      add(scores, m.effects.day_by_employment[profile.tudiaryday + " | " + profile.employment]);
      return minutes(scores);
    }
    predict(profile, dayType = "all") {
      this.validate(profile);
      if (!["all", "weekday", "weekend"].includes(dayType)) throw new Error("Choose an average day, weekday or weekend.");
      const cacheKey = JSON.stringify([profile, dayType]);
      if (this.cache.has(cacheKey)) return [...this.cache.get(cacheKey)];
      const fields = ["age", ...this.model.demographics, "model_geography"];
      const missing = fields.filter(key => profile[key] === null || profile[key] === "" || profile[key] === undefined);
      const backgrounds = missing.length ? this.model.referenceProfiles : [{ weight: 1 }];
      const grouped = new Map();
      for (const background of backgrounds) {
        const filled = { ...profile };
        for (const key of missing) filled[key] = background[key];
        const key = fields.map(f => filled[f]).join("\u001f");
        if (grouped.has(key)) grouped.get(key).weight += background.weight;
        else grouped.set(key, { profile: filled, weight: background.weight });
      }
      const result = Array(7).fill(0);
      for (const { profile: filled, weight } of grouped.values()) {
        const base = this.baseScores(filled);
        for (const cell of this.calendar(filled.employment, dayType)) {
          const prediction = minutes(base.map((x, k) => x + cell.score[k]));
          for (let k = 0; k < 7; k++) result[k] += weight * cell.weight * prediction[k];
        }
      }
      const total = result.reduce((a, b) => a + b, 0);
      if (!result.every(Number.isFinite) || Math.abs(total - 1440) > 1e-6) throw new Error("Prediction validation failed. Please choose again.");
      if (this.cache.size > 40) this.cache.clear();
      this.cache.set(cacheKey, [...result]);
      return result;
    }
  }
  global.LifestylePredictor = LifestylePredictor;
})(window);
