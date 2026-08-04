use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::project_scan::ProjectSnapshot;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AssemblerState {
    pub version: u32,
    pub project_root: PathBuf,
    pub inputs: Vec<InputFile>,
    pub outputs: Vec<OutputFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InputFile {
    pub path: String,
    pub size: u64,
    pub hash: String,
    pub role: InputRole,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum InputRole {
    Content,
    SourceCode,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OutputFile {
    pub path: String,
    pub source_path: String,
    pub source_hash: String,
}

impl AssemblerState {
    pub fn from_snapshot(snapshot: &ProjectSnapshot) -> Self {
        let inputs: Vec<InputFile> = snapshot
            .files
            .iter()
            .map(|file| InputFile {
                path: file.relative_path.clone(),
                size: file.size,
                hash: file.hash.clone(),
                role: role_from_path(&file.relative_path),
            })
            .collect();

        let outputs = inputs
            .iter()
            .filter_map(output_from_input)
            .collect();

        Self {
            version: 1,
            project_root: snapshot.project_root.clone(),
            inputs,
            outputs,
        }
    }
}

fn role_from_path(path: &str) -> InputRole {
    if path.starts_with("content/") {
        InputRole::Content
    } else if path.starts_with("src/") {
        InputRole::SourceCode
    } else {
        InputRole::Unknown
    }
}

fn output_from_input(input: &InputFile) -> Option<OutputFile> {
    match input.role {
        InputRole::SourceCode => Some(OutputFile {
            path: format!("prebuild/{}", input.path),
            source_path: input.path.clone(),
            source_hash: input.hash.clone(),
        }),
        InputRole::Content | InputRole::Unknown => None,
    }
}
