use std::process::Command;

pub fn run_app(file_path: &String) -> Result<(), String> {
    Command::new(file_path).spawn().map_err(|e| e.to_string())?;
    Ok(())
}
