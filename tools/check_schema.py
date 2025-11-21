#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Schema Consistency Checker for Advocacy Platform User Data
Validates that all JSON files follow the expected schema structure
"""

import json
from pathlib import Path


def check_schema_consistency(data_dir: str = "../data"):
    """
    Checks schema consistency across all JSON files in the data directory.
    
    Args:
        data_dir: Path to the data directory (default: ../data)
    """
    data_path = Path(__file__).parent / data_dir
    json_files = sorted(data_path.glob('user_*.json'))
    
    print('='*60)
    print('SCHEMA CONSISTENCY CHECK')
    print('='*60)
    print(f'\nScanning {len(json_files)} JSON files...\n')
    
    # Expected schema structure
    expected_top_keys = {
        'user_id', 'name', 'email', 'instagram_handle', 
        'tiktok_handle', 'joined_at', 'advocacy_programs'
    }
    expected_program_keys = {
        'program_id', 'brand', 'tasks_completed', 'total_sales_attributed'
    }
    expected_task_keys = {
        'task_id', 'platform', 'post_url', 'likes', 
        'comments', 'shares', 'reach'
    }
    
    schema_issues = []
    malformed_json = []
    valid_files = 0
    
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Check top-level keys
            top_keys = set(data.keys())
            if top_keys != expected_top_keys:
                schema_issues.append(
                    f'{json_file.name}: Top-level keys mismatch - {top_keys}'
                )
                continue
            
            # Check advocacy_programs structure
            if 'advocacy_programs' in data and isinstance(data['advocacy_programs'], list):
                for idx, program in enumerate(data['advocacy_programs']):
                    if isinstance(program, dict):
                        program_keys = set(program.keys())
                        if program_keys != expected_program_keys:
                            schema_issues.append(
                                f'{json_file.name}: Program {idx} keys mismatch - {program_keys}'
                            )
                            break
                        
                        # Check tasks_completed structure
                        if 'tasks_completed' in program and isinstance(program['tasks_completed'], list):
                            for task_idx, task in enumerate(program['tasks_completed']):
                                if isinstance(task, dict):
                                    task_keys = set(task.keys())
                                    if task_keys != expected_task_keys:
                                        schema_issues.append(
                                            f'{json_file.name}: Task {task_idx} keys mismatch - {task_keys}'
                                        )
                                        break
            
            if not any(json_file.name in issue for issue in schema_issues):
                valid_files += 1
                
        except json.JSONDecodeError as e:
            malformed_json.append(f'{json_file.name}: {str(e)}')
        except Exception as e:
            malformed_json.append(f'{json_file.name}: Error - {str(e)}')
    
    # Print results
    print(f'Total files: {len(json_files)}')
    print(f'Valid files with correct schema: {valid_files}')
    print(f'Malformed JSON files: {len(malformed_json)}')
    print(f'Valid JSON but schema mismatches: {len(schema_issues)}')
    
    if malformed_json:
        print(f'\n[!] WARNING: {len(malformed_json)} files have JSON parsing errors')
        print('First 5 examples:')
        for issue in malformed_json[:5]:
            print(f'  - {issue}')
        if len(malformed_json) > 5:
            print(f'  ... and {len(malformed_json) - 5} more')
    
    if schema_issues:
        print(f'\n[!] WARNING: {len(schema_issues)} files have schema mismatches')
        print('First 5 examples:')
        for issue in schema_issues[:5]:
            print(f'  - {issue}')
        if len(schema_issues) > 5:
            print(f'  ... and {len(schema_issues) - 5} more')
    
    if not schema_issues and not malformed_json:
        print('\n[OK] SUCCESS: All files have consistent schema!')
    elif not schema_issues:
        print('\n[OK] SCHEMA CONSISTENT: All parseable JSON files have the same schema structure')
    
    # Display expected schema
    print('\n' + '='*60)
    print('EXPECTED SCHEMA STRUCTURE')
    print('='*60)
    print('Top-level fields:')
    print('  - user_id')
    print('  - name')
    print('  - email')
    print('  - instagram_handle')
    print('  - tiktok_handle')
    print('  - joined_at')
    print('  - advocacy_programs (array)')
    print('\nadvocacy_programs[] fields:')
    print('  - program_id')
    print('  - brand')
    print('  - tasks_completed (array)')
    print('  - total_sales_attributed')
    print('\ntasks_completed[] fields:')
    print('  - task_id')
    print('  - platform')
    print('  - post_url')
    print('  - likes')
    print('  - comments')
    print('  - shares')
    print('  - reach')
    
    return {
        'total': len(json_files),
        'valid': valid_files,
        'malformed': len(malformed_json),
        'schema_issues': len(schema_issues)
    }


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Check schema consistency across JSON files'
    )
    parser.add_argument(
        '--data-dir',
        default='../data',
        help='Path to data directory (default: ../data)'
    )
    
    args = parser.parse_args()
    check_schema_consistency(args.data_dir)


