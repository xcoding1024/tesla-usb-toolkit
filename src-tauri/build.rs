fn main() {
    // Rebuild when icon files change so Dock picks up the new asset.
    println!("cargo:rerun-if-changed=icons/icon.png");
    println!("cargo:rerun-if-changed=icons/icon.icns");
    println!("cargo:rerun-if-changed=icons/32x32.png");
    println!("cargo:rerun-if-changed=icons/128x128.png");
    println!("cargo:rerun-if-changed=icons/128x128@2x.png");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    println!("cargo:rerun-if-changed=tauri.microsoftstore.conf.json");
    println!("cargo:rerun-if-changed=tauri.appstore.conf.json");
    println!("cargo:rerun-if-changed=macos/Entitlements.store.plist");
    println!("cargo:rerun-if-changed=Info.plist");
    tauri_build::build()
}
