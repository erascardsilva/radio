#!/bin/bash
set -e

APP_NAME="radiogo"
VERSION="1.0.0"
ARCH="amd64"
DEB_DIR="${APP_NAME}_${VERSION}_${ARCH}"

echo "Criando arvore de diretorios para .deb..."
mkdir -p "$DEB_DIR/DEBIAN"
mkdir -p "$DEB_DIR/usr/bin"
mkdir -p "$DEB_DIR/usr/share/applications"
mkdir -p "$DEB_DIR/usr/share/icons/hicolor/512x512/apps"

echo "Criando control file..."
cat <<EOF > "$DEB_DIR/DEBIAN/control"
Package: $APP_NAME
Version: $VERSION
Architecture: $ARCH
Maintainer: Erasmo Cardoso <erasmo@vmi-informatica.com.br>
Description: Um Media Center Híbrido. Rádios Globais, YouTube Streams e Músicas Locais.
EOF

echo "Copiando binario..."
cp build/bin/radiogo "$DEB_DIR/usr/bin/"
chmod 755 "$DEB_DIR/usr/bin/radiogo"

echo "Copiando desktop e icone..."
cp snap/gui/radiogo.desktop "$DEB_DIR/usr/share/applications/"
# Adjust the icon path in the desktop file for DEB
sed -i 's|Icon=${SNAP}/meta/gui/icon.png|Icon=radiogo|g' "$DEB_DIR/usr/share/applications/radiogo.desktop"
cp snap/gui/radiogo.png "$DEB_DIR/usr/share/icons/hicolor/512x512/apps/"

echo "Construindo o pacote .deb..."
dpkg-deb --build "$DEB_DIR"
rm -rf "$DEB_DIR"

echo "Pacote DEB construido com sucesso!"
mv *.deb build/bin/
