// Copyright 2024 Lukas Hrazky
//
// This file is part of the Refloat VESC package.
//
// Refloat VESC package is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// Refloat VESC package is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program. If not, see <http://www.gnu.org/licenses/>.

#pragma once

#include <stdbool.h>

typedef struct {
    float on_speed_up;
    float off_speed_up;
    float on_speed_down;
    float off_speed_down;

    float alpha;
    float on_speed_alpha;
    float off_speed_alpha;
    float winddown_alpha;

    bool is_winddown;

    float v1;
    float step;
    float value;
} SmoothSetpoint;

// shaping 1: bound a "down" speed limit received from the config (the firmware does
// not enforce settings.xml ranges). Called only at configure time, never in
// the control loop. NaN and values below 1 deg/s fall back to 1 deg/s, values
// above 100 deg/s are capped at 100.
static inline float clamp_speed_limit_down(float v) {
    if (!(v >= 1.0f)) {
        return 1.0f;
    }
    if (v > 100.0f) {
        return 100.0f;
    }
    return v;
}

void smooth_setpoint_init(SmoothSetpoint *st);

void smooth_setpoint_configure(
    SmoothSetpoint *st,
    float time_constant,
    float on_speed_time_constant,
    float off_speed_time_constant,
    float winddown_time_constant,
    float on_speed_up,
    float off_speed_up,
    float on_speed_down,
    float off_speed_down,
    float frequency
);

void smooth_setpoint_reset(SmoothSetpoint *st);

void smooth_setpoint_update(SmoothSetpoint *st, float target, bool forward, float mult, float dt);

void smooth_setpoint_winddown(SmoothSetpoint *st);
