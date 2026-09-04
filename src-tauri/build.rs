use std::path::Path;

fn main() {
    engines_present_in_release_builds();
    tauri_build::build()
}

/// A release build with an empty `binaries/` produces an app that silently falls
/// back to whatever `yt-dlp`/`ffmpeg` happen to be on the machine's PATH — which
/// works on the developer's box and fails at merge time, after a full download,
/// on everyone else's. Refuse to build it.
///
/// Debug builds keep the fallback: that's how `npm run tauri dev` works without
/// fetching ~100MB of engines first.
fn engines_present_in_release_builds() {
    println!("cargo:rerun-if-changed=binaries");
    if std::env::var("PROFILE").as_deref() != Ok("release") {
        return;
    }
    let (os, exe) = match std::env::var("CARGO_CFG_TARGET_OS").as_deref() {
        Ok("windows") => ("windows", ".exe"),
        Ok("macos") => ("macos", ""),
        _ => ("linux", ""),
    };
    for name in ["yt-dlp", "ffmpeg"] {
        let path = Path::new("binaries").join(os).join(format!("{name}{exe}"));
        if !path.exists() {
            panic!(
                "missing bundled engine: {}\n\
                 Run `scripts/fetch-binaries.ps1 {os}` (or `scripts/fetch-binaries.sh {os}`) \
                 before building a release, or the packaged app will look for {name} on the \
                 user's PATH and fail after downloading.",
                path.display()
            );
        }
    }
}
