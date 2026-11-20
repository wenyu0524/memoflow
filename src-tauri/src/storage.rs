use std::{fs, io::Write, path::{Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};
use serde_json::Value;

fn suffix(path: &Path, extension: &str) -> PathBuf {
    let mut name = path.as_os_str().to_owned(); name.push(extension); PathBuf::from(name)
}

pub fn validate(file: &str, data: &Value) -> Result<(), String> {
    let valid = match file {
        "todo.json" => data.as_array().map(|items| items.iter().all(|item|
            item["id"].is_string() && item["title"].is_string() && item["completed"].is_boolean()
            && item["createdAt"].is_string() && item["updatedAt"].is_string())).unwrap_or(false),
        "memo.json" => data["content"].is_string() && (data["updatedAt"].is_null() || data["updatedAt"].is_string()),
        "settings.json" => matches!(data["themeMode"].as_str(), Some("auto" | "light" | "dark"))
            && data["alwaysOnTop"].is_boolean() && data["editingLocked"].is_boolean()
            && data["window"]["width"].as_f64().map(|v| v > 0.0).unwrap_or(false)
            && data["window"]["height"].as_f64().map(|v| v > 0.0).unwrap_or(false),
        "pet-settings.json" => data["enabled"].is_boolean() && data["autoStart"].is_boolean()
            && matches!(data["style"].as_str(), Some("cute" | "funny" | "strict" | "encouraging"))
            && matches!(data["minutes"].as_u64(), Some(5 | 15 | 30 | 60))
            && matches!(data["character"].as_str(), Some("cream" | "xiaohei")),
        _ => false,
    };
    if valid { Ok(()) } else { Err(format!("invalid data: {file}")) }
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let temp = suffix(path, ".tmp");
    let result = (|| {
        let mut file = fs::File::create(&temp)?;
        file.write_all(bytes)?; file.sync_all()?;
        drop(file);
        fs::rename(&temp, path)
    })();
    if result.is_err() { let _ = fs::remove_file(&temp); }
    result.map_err(|error: std::io::Error| error.to_string())
}

fn parse(file: &str, bytes: &[u8]) -> Result<Value, String> {
    let data = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
    validate(file, &data)?; Ok(data)
}

fn preserve_corrupt(path: &Path) -> Result<(), String> {
    if path.exists() {
        let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
        fs::copy(path, suffix(path, &format!(".corrupt-{stamp}"))).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn read(path: &Path, file: &str, default: &str) -> Result<(Value, bool), String> {
    let backup = suffix(path, ".bak");
    let temporary = suffix(path, ".tmp");
    if !path.exists() && !backup.exists() && !temporary.exists() {
        let data = parse(file, default.as_bytes())?;
        atomic_write(path, default.as_bytes())?; return Ok((data, false));
    }
    if let Ok(bytes) = fs::read(path) {
        if let Ok(data) = parse(file, &bytes) { return Ok((data, false)); }
    }
    let recovered = [&backup, &temporary].iter().find_map(|candidate| {
        let bytes = fs::read(candidate).ok()?;
        let data = parse(file, &bytes).ok()?;
        Some((bytes, data))
    });
    let (bytes, data) = recovered.ok_or_else(|| format!("{file} is unreadable and no usable backup exists; original data retained"))?;
    preserve_corrupt(path)?;
    atomic_write(path, &bytes)?;
    Ok((data, true))
}

pub fn write(path: &Path, file: &str, data: &Value) -> Result<(), String> {
    validate(file, data)?;
    let bytes = serde_json::to_vec_pretty(data).map_err(|e| e.to_string())?;
    if let Ok(previous) = fs::read(path) {
        if parse(file, &previous).is_ok() { atomic_write(&suffix(path, ".bak"), &previous)?; }
        else { preserve_corrupt(path)?; }
    }
    atomic_write(path, &bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn directory() -> PathBuf {
        let stamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let path = std::env::temp_dir().join(format!("memoflow-storage-{}-{stamp}", std::process::id()));
        fs::create_dir(&path).unwrap(); path
    }
    #[test]
    fn backup_recovers_corrupt_data_without_discarding_the_original() {
        let dir = directory(); let path = dir.join("memo.json");
        let first = serde_json::json!({"content":"first", "updatedAt":null});
        write(&path, "memo.json", &first).unwrap();
        write(&path, "memo.json", &serde_json::json!({"content":"second", "updatedAt":null})).unwrap();
        fs::write(&path, b"broken").unwrap();
        let (data, recovered) = read(&path, "memo.json", "{}").unwrap();
        assert!(recovered); assert_eq!(data, first);
        assert!(fs::read_dir(&dir).unwrap().any(|entry| entry.unwrap().file_name().to_string_lossy().contains(".corrupt-")));
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn failed_write_and_invalid_input_leave_the_existing_file_intact() {
        let dir = directory(); let path = dir.join("memo.json");
        let value = serde_json::json!({"content":"keep", "updatedAt":null});
        write(&path, "memo.json", &value).unwrap();
        assert!(write(&path, "memo.json", &serde_json::json!([])).is_err());
        fs::create_dir(suffix(&path, ".tmp")).unwrap();
        assert!(write(&path, "memo.json", &value).is_err());
        assert_eq!(read(&path, "memo.json", "{}").unwrap().0, value);
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn corrupt_data_without_a_backup_is_never_replaced_with_empty_defaults() {
        let dir = directory(); let path = dir.join("todo.json");
        fs::write(&path, b"broken").unwrap();
        assert!(read(&path, "todo.json", "[]").is_err());
        assert_eq!(fs::read(&path).unwrap(), b"broken");
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn first_save_interrupted_before_rename_recovers_the_complete_temporary_file() {
        let dir = directory(); let path = dir.join("memo.json");
        fs::write(suffix(&path, ".tmp"), br#"{"content":"first save", "updatedAt":null}"#).unwrap();
        let (data, recovered) = read(&path, "memo.json", r#"{"content":"", "updatedAt":null}"#).unwrap();
        assert!(recovered); assert_eq!(data["content"], "first save");
        fs::remove_dir_all(dir).unwrap();
    }
}
