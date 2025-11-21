#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JSON Repair Tool for Advocacy Platform User Data
Identifies and fixes broken JSON files (missing braces, invalid syntax, etc.)
"""

import json
from pathlib import Path


def fix_broken_json_files(data_dir: str = "../data"):
    """
    Identifies and fixes broken JSON files in the data directory.
    The common issue is missing closing braces at the end of files.
    
    Args:
        data_dir: Path to the data directory (default: ../data)
    """
    data_path = Path(__file__).parent / data_dir
    json_files = sorted(data_path.glob('user_*.json'))
    
    print('='*60)
    print('JSON FILE REPAIR TOOL')
    print('='*60)
    print(f'\nScanning {len(json_files)} JSON files...\n')
    
    broken_files = []
    fixed_files = []
    unfixable_files = []
    
    # First pass: identify broken files
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            broken_files.append((json_file, str(e)))
    
    print(f'Found {len(broken_files)} broken JSON files')
    
    if not broken_files:
        print('\n[OK] All JSON files are valid!')
        return {
            'total': len(json_files),
            'broken': 0,
            'fixed': 0,
            'unfixable': 0
        }
    
    print(f'Attempting to repair...\n')
    
    # Second pass: attempt to fix broken files
    for json_file, error in broken_files:
        try:
            # Read the file content
            with open(json_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Try common fixes
            fixed_content = None
            
            # Fix 1: Missing closing brace at the end
            if content.strip().endswith(']'):
                fixed_content = content.rstrip() + '\n}'
            
            # Fix 2: Extra trailing content after valid JSON
            elif not content.strip().endswith('}'):
                # Try to find the last ] and add }
                if ']' in content:
                    last_bracket = content.rfind(']')
                    fixed_content = content[:last_bracket+1].rstrip() + '\n}'
            
            if fixed_content:
                # Validate the fix
                try:
                    json.loads(fixed_content)
                    
                    # Write the fixed content back
                    with open(json_file, 'w', encoding='utf-8') as f:
                        f.write(fixed_content)
                    
                    fixed_files.append(json_file.name)
                    print(f'  [OK] Fixed: {json_file.name}')
                    
                except json.JSONDecodeError:
                    unfixable_files.append((json_file.name, 'Fix did not produce valid JSON'))
                    print(f'  [X] Could not fix: {json_file.name}')
            else:
                unfixable_files.append((json_file.name, 'No applicable fix found'))
                print(f'  [X] Could not fix: {json_file.name}')
                
        except Exception as e:
            unfixable_files.append((json_file.name, str(e)))
            print(f'  [X] Error fixing {json_file.name}: {e}')
    
    # Summary
    print('\n' + '='*60)
    print('REPAIR SUMMARY')
    print('='*60)
    print(f'Total broken files: {len(broken_files)}')
    print(f'Successfully fixed: {len(fixed_files)}')
    print(f'Could not fix: {len(unfixable_files)}')
    
    if unfixable_files:
        print('\nUnfixable files:')
        for filename, reason in unfixable_files[:5]:
            print(f'  - {filename}: {reason}')
        if len(unfixable_files) > 5:
            print(f'  ... and {len(unfixable_files) - 5} more')
    
    # Verification pass
    print('\n' + '='*60)
    print('VERIFICATION')
    print('='*60)
    
    all_valid = 0
    still_broken = 0
    
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                json.load(f)
            all_valid += 1
        except json.JSONDecodeError:
            still_broken += 1
    
    print(f'Valid JSON files: {all_valid}/{len(json_files)}')
    print(f'Still broken: {still_broken}')
    
    if still_broken == 0:
        print('\n[OK] SUCCESS: All JSON files are now valid!')
    else:
        print(f'\n[!] WARNING: {still_broken} files still have issues')
    
    return {
        'total': len(json_files),
        'broken': len(broken_files),
        'fixed': len(fixed_files),
        'unfixable': len(unfixable_files),
        'still_broken': still_broken
    }


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Fix broken JSON files in the data directory'
    )
    parser.add_argument(
        '--data-dir',
        default='../data',
        help='Path to data directory (default: ../data)'
    )
    
    args = parser.parse_args()
    fix_broken_json_files(args.data_dir)


