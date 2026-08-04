mod assembler_state;
mod block_definition;
mod content_reader;
mod file_hash;
mod prebuild_writer;
mod project_config;
mod project_scan;
mod state_diff;
mod state_store;

use std::path::PathBuf;
use std::{env, process};

use assembler_state::AssemblerState;
use block_definition::load_block_dataset;
use content_reader::read_content_model;
use prebuild_writer::materialize_prebuild_sources;
use project_config::ProjectConfig;
use project_scan::scan_project;
use state_diff::diff_states;
use state_store::{load_state, store_state};

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() != 2 {
        eprintln!("usage: bezot_project_assembler <project-root>");
        process::exit(1);
    }

    let project_root = PathBuf::from(&args[1]);
    let config = ProjectConfig::default_site_project();

    let block_dataset = match load_block_dataset() {
        Ok(dataset) => dataset,
        Err(error) => {
            eprintln!("error: {error}");
            process::exit(1);
        }
    };

    let result = scan_project(&project_root, &config)
        .and_then(|snapshot| {
            let content_model = read_content_model(&snapshot.project_root)?;

            Ok((snapshot, content_model))
        })
        .map(|(snapshot, content_model)| {
            let state = AssemblerState::from_snapshot(&snapshot);

            (state, content_model)
        })
        .and_then(|(new_state, content_model)| {
            let old_state = load_state(&new_state.project_root)?;
            let diff = diff_states(old_state.as_ref(), &new_state);
            let materialization = materialize_prebuild_sources(old_state.as_ref(), &new_state)?;

            let state_written = if diff.has_changes() || materialization.has_changes() {
                store_state(&new_state)?;
                true
            } else {
                false
            };

            Ok((
                new_state,
                content_model,
                diff,
                materialization,
                state_written,
            ))
        });

    match result {
        Ok((state, content_model, diff, materialization, state_written)) => {
            println!("project_root: {}", state.project_root.display());
            println!("inputs: {}", state.inputs.len());
            println!("block_definitions: {}", block_dataset.blocks.len());
            println!("content_pages: {}", content_model.pages.len());
            println!("content_posts: {}", content_model.posts.len());
            println!("added_inputs: {}", diff.added_inputs.len());
            println!("changed_inputs: {}", diff.changed_inputs.len());
            println!("removed_inputs: {}", diff.removed_inputs.len());
            println!("outputs_changed: {}", diff.outputs_changed);
            println!("prebuild_written: {}", materialization.written);
            println!("prebuild_unchanged: {}", materialization.unchanged);
            println!("prebuild_deleted: {}", materialization.deleted);
            println!("state_written: {}", state_written);
        }
        Err(error) => {
            eprintln!("error: {error}");
            process::exit(1);
        }
    }
}
