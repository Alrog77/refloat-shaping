# use `make VESC_TOOL=path/to/your/vesc_tool` to specify custom vesc_tool path
VESC_TOOL ?= vesc_tool
# use `make MINIFY_QML=0` to skip qml minification and pack the qml verbatim
MINIFY_QML ?= 1
# use `make OLDVT=1` to build with old vesc_tool which doesn't support pkgdesc.qml
OLDVT ?= 0

all: refloat.vescpkg

refloat.vescpkg: src lisp/package.lisp package_README-gen.md ui.qml
ifeq ($(OLDVT), 1)
	"$(VESC_TOOL)" --buildPkg "refloat.vescpkg:lisp/package.lisp:ui.qml:0:package_README-gen.md:Refloat"
else
	"$(VESC_TOOL)" --buildPkgFromDesc pkgdesc.qml
endif

src:
	$(MAKE) -C $@

VERSION=`cat version`
PACKAGE_NAME=`cat package_name | cut -c-20`

ifeq ($(strip $(MINIFY_QML)),1)
    MINIFY_CMD="./rjsmin.py"
else
    MINIFY_CMD="cat"
endif

package_README-gen.md: package_README.md version
	cp $< $@
	echo "" >> $@
	echo "### Build Info" >> $@
	echo "- Version: ${VERSION}" >> $@
	echo "- Build Date: `date -u '+%Y-%m-%d %H:%M:%S+00:00'`" >> $@
	echo "- Git Commit: #`git rev-parse --short HEAD 2>/dev/null || echo none`" >> $@

ui.qml: ui.qml.in package_name version
	cat $< | \
	sed "s/{{PACKAGE_NAME}}/${PACKAGE_NAME}/g" | \
	sed "s/{{VERSION}}/${VERSION}/g" | \
	${MINIFY_CMD} > $@

clean:
	rm -f refloat.vescpkg package_README-gen.md ui.qml
	$(MAKE) -C src clean

# Refloat Shaping: slider engine tests (requires Node, not part of the build)
test:
	node shaping/test.js ui.qml.in
	node shaping/test-battery.js ui.qml.in

.PHONY: all clean src test
