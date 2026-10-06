# Refloat Shaping (personal fork)

Experimental fork of Refloat 1.3 with Dynamic Pitch KP and Booster Pitch KP (`v1.3-mkp_booster` branch by Nico Aleman). The control loop is almost unchanged; most of the work is a UI *Sliders* page that groups existing parameters into a few rider-oriented, bounded sliders (0 = stock values). See [CHANGES-shaping.md](CHANGES-shaping.md) and the [sliders reference](docs/sliders.md).

Tested on a single board only. Use at your own risk. Official Refloat: [github.com/lukash/refloat](https://github.com/lukash/refloat).

To build: `./build-shaping4.sh` (requires `gcc-arm-embedded`, `make`, `vesc_tool`; `make test` runs the slider engine tests with Node).

---

# Refloat - VESC Package
Refloat is a VESC Package for self-balancing skateboards. It aims to:
- Provide a polished and full-featured user experience
- Maintain a clean and reliable codebase that is easy to extend
- Make it easy for anyone to use Refloat as a base for experimentation
- Standardize interfaces so that package clones can interact with other parts of the ecosystem (3rd party apps, light modules, VESC Express addons etc.) in a compatible way

_**If you're looking for README of the actual package, you can find it [here](package_README.md).**_

## Contributing
Contributions are welcome and appreciated, please refer to [Contributing](CONTRIBUTING.md).

## Building
### Requirements
- `gcc-arm-embedded` version 13 or higher
- `make`
- `vesc_tool`

To build the package, run:
```sh
make
```

Note a new beta (as of writing this, unreleased) version of `vesc_tool` is needed for the above to work. To build the package with the current / old `vesc_tool` version, use:
```sh
make OLDVT=1
```

If you don't have `vesc_tool` in your `$PATH` (but you have, for example, a downloaded `vesc_tool` binary), you can specify the `vesc_tool` to use:
```sh
make VESC_TOOL=/path/to/vesc_tool
```
For macOS, the path to VESC Tool when installed using the official installer is as follows:
```sh
make VESC_TOOL="/Applications/VESC Tool.app/Contents/MacOS/VESC Tool"
```

## Documentation
[Development Documentation](doc/index.md)
