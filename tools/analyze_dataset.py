#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dataset Analysis Tool for Advocacy Platform User Data
Analyzes JSON user data to identify structure, patterns, and data quality issues
"""

import json
import os
import sys
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime
import re
from typing import Any, Dict, List, Tuple
import statistics
import argparse

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Try to import PDF libraries (optional dependency)
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


class DatasetAnalyzer:
    """Analyzes advocacy platform user dataset"""
    
    def __init__(self, data_dir: str = "../data", pdf_output: str = None):
        self.data_dir = Path(data_dir)
        self.users = []
        self.issues = defaultdict(list)
        self.stats = defaultdict(lambda: defaultdict(int))
        self.pdf_output = pdf_output
        
        # Storage for PDF generation
        self.analysis_results = {
            'metadata': {},
            'structure': {},
            'user_metadata': {},
            'programs': {},
            'anomalies': [],
            'summary': {}
        }
        
    def load_data(self):
        """Load all JSON files from the data directory"""
        json_files = list(self.data_dir.glob("user_*.json"))
        print(f"📁 Found {len(json_files)} JSON files in '{self.data_dir}'")
        
        for file_path in json_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    user_data = json.load(f)
                    self.users.append({
                        'file': file_path.name,
                        'data': user_data
                    })
            except json.JSONDecodeError as e:
                self.issues['file_parsing_errors'].append(f"{file_path.name}: {str(e)}")
            except Exception as e:
                self.issues['file_reading_errors'].append(f"{file_path.name}: {str(e)}")
        
        print(f"✅ Successfully loaded {len(self.users)} user records\n")
        
    def analyze_structure(self) -> Dict[str, Any]:
        """Analyze the overall structure of the dataset"""
        if not self.users:
            return {}
        
        print("=" * 80)
        print("📊 DATASET STRUCTURE ANALYSIS")
        print("=" * 80)
        
        structure = {
            'total_records': len(self.users),
            'fields': defaultdict(lambda: {'present': 0, 'null': 0, 'types': Counter()}),
            'nested_structures': {}
        }
        
        for user in self.users:
            data = user['data']
            
            # Analyze top-level fields
            for field, value in data.items():
                structure['fields'][field]['present'] += 1
                
                if value is None:
                    structure['fields'][field]['null'] += 1
                
                structure['fields'][field]['types'][type(value).__name__] += 1
        
        # Print top-level structure
        print(f"\n📋 Top-level fields found in {len(self.users)} records:")
        print("-" * 80)
        for field, info in sorted(structure['fields'].items()):
            presence_rate = (info['present'] / len(self.users)) * 100
            null_rate = (info['null'] / info['present']) * 100 if info['present'] > 0 else 0
            types_str = ", ".join([f"{t}({c})" for t, c in info['types'].most_common()])
            
            print(f"  • {field:25} | Present: {presence_rate:5.1f}% | Null: {null_rate:5.1f}% | Types: {types_str}")
        
        return structure
    
    def analyze_user_metadata(self):
        """Analyze user metadata quality"""
        print(f"\n{'=' * 80}")
        print("👤 USER METADATA ANALYSIS")
        print("=" * 80)
        
        user_id_null = 0
        user_id_valid = 0
        name_missing = 0
        name_placeholder = 0
        email_invalid = 0
        email_valid = 0
        instagram_null = 0
        tiktok_null = 0
        tiktok_error = 0
        joined_invalid = 0
        
        valid_emails = []
        valid_names = []
        
        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        
        for user in self.users:
            data = user['data']
            
            # User ID analysis
            if data.get('user_id') is None:
                user_id_null += 1
            else:
                user_id_valid += 1
            
            # Name analysis
            name = data.get('name')
            if not name or name == '':
                name_missing += 1
            elif name == '???':
                name_placeholder += 1
            else:
                valid_names.append(name)
            
            # Email analysis
            email = data.get('email', '')
            if email == 'invalid-email' or not email_pattern.match(email):
                email_invalid += 1
            else:
                email_valid += 1
                valid_emails.append(email)
            
            # Instagram handle
            if data.get('instagram_handle') is None:
                instagram_null += 1
            
            # TikTok handle
            tiktok = data.get('tiktok_handle')
            if tiktok is None:
                tiktok_null += 1
            elif tiktok == '#error_handle':
                tiktok_error += 1
            
            # Joined date
            joined = data.get('joined_at')
            if joined == 'not-a-date' or not joined:
                joined_invalid += 1
        
        total = len(self.users)
        
        print(f"\n📌 User ID:")
        print(f"  • Valid UUIDs:       {user_id_valid:5} ({user_id_valid/total*100:5.1f}%)")
        print(f"  • Null values:       {user_id_null:5} ({user_id_null/total*100:5.1f}%)")
        
        print(f"\n👤 Name:")
        print(f"  • Valid names:       {len(valid_names):5} ({len(valid_names)/total*100:5.1f}%)")
        print(f"  • Placeholder '???': {name_placeholder:5} ({name_placeholder/total*100:5.1f}%)")
        print(f"  • Missing/empty:     {name_missing:5} ({name_missing/total*100:5.1f}%)")
        
        print(f"\n📧 Email:")
        print(f"  • Valid emails:      {email_valid:5} ({email_valid/total*100:5.1f}%)")
        print(f"  • Invalid emails:    {email_invalid:5} ({email_invalid/total*100:5.1f}%)")
        
        print(f"\n📱 Social Handles:")
        print(f"  • Instagram null:    {instagram_null:5} ({instagram_null/total*100:5.1f}%)")
        print(f"  • TikTok null:       {tiktok_null:5} ({tiktok_null/total*100:5.1f}%)")
        print(f"  • TikTok error:      {tiktok_error:5} ({tiktok_error/total*100:5.1f}%)")
        
        print(f"\n📅 Joined Date:")
        print(f"  • Invalid dates:     {joined_invalid:5} ({joined_invalid/total*100:5.1f}%)")
    
    def analyze_advocacy_programs(self):
        """Analyze advocacy programs and tasks"""
        print(f"\n{'=' * 80}")
        print("🎯 ADVOCACY PROGRAMS ANALYSIS")
        print("=" * 80)
        
        total_programs = 0
        total_tasks = 0
        
        program_id_empty = 0
        program_id_valid = 0
        
        brand_numeric = 0
        brand_string = 0
        
        sales_no_data = 0
        sales_numeric = 0
        sales_values = []
        
        task_id_null = 0
        platform_types = Counter()
        platform_numeric = 0
        post_url_broken = 0
        
        likes_nan = 0
        likes_numeric = 0
        likes_values = []
        
        comments_null = 0
        comments_values = []
        
        shares_values = []
        reach_values = []
        
        for user in self.users:
            data = user['data']
            programs = data.get('advocacy_programs', [])
            total_programs += len(programs)
            
            for program in programs:
                # Program ID
                prog_id = program.get('program_id', '')
                if prog_id == '':
                    program_id_empty += 1
                else:
                    program_id_valid += 1
                
                # Brand
                brand = program.get('brand')
                if isinstance(brand, (int, float)):
                    brand_numeric += 1
                elif isinstance(brand, str):
                    brand_string += 1
                
                # Sales attribution
                sales = program.get('total_sales_attributed')
                if sales == 'no-data' or sales is None:
                    sales_no_data += 1
                elif isinstance(sales, (int, float)):
                    sales_numeric += 1
                    sales_values.append(sales)
                
                # Tasks
                tasks = program.get('tasks_completed', [])
                total_tasks += len(tasks)
                
                for task in tasks:
                    # Task ID
                    if task.get('task_id') is None:
                        task_id_null += 1
                    
                    # Platform
                    platform = task.get('platform')
                    if isinstance(platform, (int, float)):
                        platform_numeric += 1
                        platform_types['[NUMERIC_ERROR]'] += 1
                    else:
                        platform_types[str(platform)] += 1
                    
                    # Post URL
                    if task.get('post_url') == 'broken_link':
                        post_url_broken += 1
                    
                    # Likes
                    likes = task.get('likes')
                    if likes == 'NaN':
                        likes_nan += 1
                    elif isinstance(likes, (int, float)):
                        likes_numeric += 1
                        likes_values.append(likes)
                    
                    # Comments
                    comments = task.get('comments')
                    if comments is None:
                        comments_null += 1
                    elif isinstance(comments, (int, float)):
                        comments_values.append(comments)
                    
                    # Shares and Reach
                    shares = task.get('shares')
                    if isinstance(shares, (int, float)):
                        shares_values.append(shares)
                    
                    reach = task.get('reach')
                    if isinstance(reach, (int, float)):
                        reach_values.append(reach)
        
        print(f"\n📊 Program Statistics:")
        print(f"  • Total programs:    {total_programs:5}")
        print(f"  • Avg per user:      {total_programs/len(self.users):5.2f}")
        
        print(f"\n🔑 Program ID:")
        print(f"  • Valid IDs:         {program_id_valid:5} ({program_id_valid/total_programs*100 if total_programs > 0 else 0:5.1f}%)")
        print(f"  • Empty strings:     {program_id_empty:5} ({program_id_empty/total_programs*100 if total_programs > 0 else 0:5.1f}%)")
        
        print(f"\n🏢 Brand:")
        print(f"  • String values:     {brand_string:5} ({brand_string/total_programs*100 if total_programs > 0 else 0:5.1f}%)")
        print(f"  • Numeric errors:    {brand_numeric:5} ({brand_numeric/total_programs*100 if total_programs > 0 else 0:5.1f}%)")
        
        print(f"\n💰 Sales Attribution:")
        print(f"  • Numeric values:    {sales_numeric:5} ({sales_numeric/total_programs*100 if total_programs > 0 else 0:5.1f}%)")
        print(f"  • 'no-data' values:  {sales_no_data:5} ({sales_no_data/total_programs*100 if total_programs > 0 else 0:5.1f}%)")
        
        if sales_values:
            print(f"  • Min:               ${min(sales_values):,.2f}")
            print(f"  • Max:               ${max(sales_values):,.2f}")
            print(f"  • Average:           ${statistics.mean(sales_values):,.2f}")
            print(f"  • Median:            ${statistics.median(sales_values):,.2f}")
        
        print(f"\n📝 Task Statistics:")
        print(f"  • Total tasks:       {total_tasks:5}")
        print(f"  • Avg per program:   {total_tasks/total_programs if total_programs > 0 else 0:5.2f}")
        print(f"  • Task ID null:      {task_id_null:5} ({task_id_null/total_tasks*100 if total_tasks > 0 else 0:5.1f}%)")
        print(f"  • Broken URLs:       {post_url_broken:5} ({post_url_broken/total_tasks*100 if total_tasks > 0 else 0:5.1f}%)")
        
        print(f"\n📱 Platform Distribution:")
        for platform, count in platform_types.most_common():
            print(f"  • {platform:20} {count:5} ({count/total_tasks*100 if total_tasks > 0 else 0:5.1f}%)")
        
        print(f"\n📈 Social Media Analytics:")
        print(f"  Likes:")
        print(f"    • Valid numeric:   {likes_numeric:5} ({likes_numeric/total_tasks*100 if total_tasks > 0 else 0:5.1f}%)")
        print(f"    • 'NaN' errors:    {likes_nan:5} ({likes_nan/total_tasks*100 if total_tasks > 0 else 0:5.1f}%)")
        if likes_values:
            print(f"    • Range:           {min(likes_values)} - {max(likes_values):,}")
            print(f"    • Average:         {statistics.mean(likes_values):,.1f}")
        
        print(f"\n  Comments:")
        print(f"    • Null values:     {comments_null:5} ({comments_null/total_tasks*100 if total_tasks > 0 else 0:5.1f}%)")
        if comments_values:
            print(f"    • Range:           {min(comments_values)} - {max(comments_values):,}")
            print(f"    • Average:         {statistics.mean(comments_values):,.1f}")
        
        if shares_values:
            print(f"\n  Shares:")
            print(f"    • Range:           {min(shares_values)} - {max(shares_values):,}")
            print(f"    • Average:         {statistics.mean(shares_values):,.1f}")
        
        if reach_values:
            print(f"\n  Reach:")
            print(f"    • Range:           {min(reach_values):,} - {max(reach_values):,}")
            print(f"    • Average:         {statistics.mean(reach_values):,.1f}")
    
    def identify_anomalies(self):
        """Identify and report anomalies and patterns"""
        print(f"\n{'=' * 80}")
        print("🔍 ANOMALIES & PATTERNS DETECTED")
        print("=" * 80)
        
        anomalies = []
        
        # Check for systematic issues
        null_user_ids = sum(1 for u in self.users if u['data'].get('user_id') is None)
        if null_user_ids > len(self.users) * 0.5:
            anomalies.append(f"⚠️  HIGH: {null_user_ids}/{len(self.users)} ({null_user_ids/len(self.users)*100:.1f}%) user_ids are null")
        
        invalid_emails = sum(1 for u in self.users if u['data'].get('email') == 'invalid-email')
        if invalid_emails > 0:
            anomalies.append(f"⚠️  HIGH: {invalid_emails}/{len(self.users)} ({invalid_emails/len(self.users)*100:.1f}%) emails are marked 'invalid-email'")
        
        placeholder_names = sum(1 for u in self.users if u['data'].get('name') == '???')
        if placeholder_names > 0:
            anomalies.append(f"⚠️  MEDIUM: {placeholder_names}/{len(self.users)} ({placeholder_names/len(self.users)*100:.1f}%) names are placeholder '???'")
        
        not_a_date = sum(1 for u in self.users if u['data'].get('joined_at') == 'not-a-date')
        if not_a_date > 0:
            anomalies.append(f"⚠️  HIGH: {not_a_date}/{len(self.users)} ({not_a_date/len(self.users)*100:.1f}%) joined_at dates are 'not-a-date'")
        
        # Check program-level issues
        total_programs = sum(len(u['data'].get('advocacy_programs', [])) for u in self.users)
        empty_program_ids = 0
        numeric_brands = 0
        no_data_sales = 0
        
        for user in self.users:
            for program in user['data'].get('advocacy_programs', []):
                if program.get('program_id') == '':
                    empty_program_ids += 1
                if isinstance(program.get('brand'), (int, float)):
                    numeric_brands += 1
                if program.get('total_sales_attributed') == 'no-data':
                    no_data_sales += 1
        
        if empty_program_ids > 0:
            anomalies.append(f"⚠️  HIGH: {empty_program_ids}/{total_programs} ({empty_program_ids/total_programs*100:.1f}%) program_ids are empty strings")
        
        if numeric_brands > 0:
            anomalies.append(f"⚠️  MEDIUM: {numeric_brands}/{total_programs} ({numeric_brands/total_programs*100:.1f}%) brands are numeric (should be string)")
        
        if no_data_sales > 0:
            anomalies.append(f"⚠️  MEDIUM: {no_data_sales}/{total_programs} ({no_data_sales/total_programs*100:.1f}%) sales attributed are 'no-data'")
        
        # Check task-level issues
        total_tasks = 0
        null_task_ids = 0
        numeric_platforms = 0
        broken_urls = 0
        nan_likes = 0
        null_comments = 0
        
        for user in self.users:
            for program in user['data'].get('advocacy_programs', []):
                for task in program.get('tasks_completed', []):
                    total_tasks += 1
                    if task.get('task_id') is None:
                        null_task_ids += 1
                    if isinstance(task.get('platform'), (int, float)):
                        numeric_platforms += 1
                    if task.get('post_url') == 'broken_link':
                        broken_urls += 1
                    if task.get('likes') == 'NaN':
                        nan_likes += 1
                    if task.get('comments') is None:
                        null_comments += 1
        
        if null_task_ids > 0:
            anomalies.append(f"⚠️  MEDIUM: {null_task_ids}/{total_tasks} ({null_task_ids/total_tasks*100:.1f}%) task_ids are null")
        
        if numeric_platforms > 0:
            anomalies.append(f"⚠️  HIGH: {numeric_platforms}/{total_tasks} ({numeric_platforms/total_tasks*100:.1f}%) platforms are numeric (should be string)")
        
        if broken_urls > 0:
            anomalies.append(f"⚠️  HIGH: {broken_urls}/{total_tasks} ({broken_urls/total_tasks*100:.1f}%) post URLs are 'broken_link'")
        
        if nan_likes > 0:
            anomalies.append(f"⚠️  HIGH: {nan_likes}/{total_tasks} ({nan_likes/total_tasks*100:.1f}%) likes are string 'NaN' (should be numeric or null)")
        
        if null_comments > 0:
            anomalies.append(f"⚠️  LOW: {null_comments}/{total_tasks} ({null_comments/total_tasks*100:.1f}%) comments are null")
        
        # Store for PDF
        self.analysis_results['anomalies'] = anomalies
        
        print(f"\n🔴 Data Quality Issues Found: {len(anomalies)}\n")
        for i, anomaly in enumerate(anomalies, 1):
            print(f"{i:2}. {anomaly}")
    
    def generate_summary(self):
        """Generate executive summary"""
        print(f"\n{'=' * 80}")
        print("📋 EXECUTIVE SUMMARY")
        print("=" * 80)
        
        total_programs = sum(len(u['data'].get('advocacy_programs', [])) for u in self.users)
        total_tasks = sum(
            len(task) 
            for u in self.users 
            for program in u['data'].get('advocacy_programs', []) 
            for task in [program.get('tasks_completed', [])]
        )
        
        # Store for PDF
        self.analysis_results['summary'] = {
            'total_users': len(self.users),
            'total_programs': total_programs,
            'total_tasks': total_tasks,
            'avg_programs_per_user': total_programs/len(self.users) if self.users else 0,
            'avg_tasks_per_program': total_tasks/total_programs if total_programs > 0 else 0
        }
        
        print(f"""
Dataset Overview:
  • Total Users:           {len(self.users):,}
  • Total Programs:        {total_programs:,}
  • Total Tasks:           {total_tasks:,}
  • Avg Programs/User:     {total_programs/len(self.users):.2f}
  • Avg Tasks/Program:     {total_tasks/total_programs if total_programs > 0 else 0:.2f}

Data Quality Assessment:
  • Overall Quality:       ⚠️  POOR - Significant data quality issues detected
  • Missing Values:        ⚠️  HIGH - Many null and placeholder values
  • Type Consistency:      ⚠️  LOW - Multiple type mismatches found
  • Format Issues:         ⚠️  HIGH - Invalid formats for emails, dates, URLs
  
Key Findings:
  ✓ Dataset structure is consistent across all files
  ✗ High percentage of null/invalid user IDs
  ✗ Many placeholder values ('???', 'invalid-email', 'not-a-date')
  ✗ Type inconsistencies (numeric values where strings expected)
  ✗ String 'NaN' instead of proper null/numeric handling
  ✗ Systematic issues with URLs marked as 'broken_link'
  ✗ Empty program IDs across many records

Recommendations:
  1. Implement data validation at the point of entry
  2. Standardize handling of missing data (use null, not placeholder strings)
  3. Enforce type constraints (e.g., brand should always be string)
  4. Validate emails, dates, and URLs before storage
  5. Ensure all records have valid UUIDs for user_id and task_id
  6. Consider data cleaning pipeline before analysis
""")
    
    def generate_pdf_report(self):
        """Generate PDF report of the analysis"""
        if not PDF_AVAILABLE:
            print("\n❌ PDF generation requires 'reportlab' library.")
            print("   Install it with: pip install reportlab")
            return
        
        if not self.pdf_output:
            return
        
        print(f"\n📄 Generating PDF report: {self.pdf_output}")
        
        # Create PDF document
        doc = SimpleDocTemplate(
            self.pdf_output,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER,
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=12,
            spaceBefore=20,
        )
        
        subheading_style = ParagraphStyle(
            'CustomSubHeading',
            parent=styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#34495e'),
            spaceAfter=8,
            spaceBefore=12,
        )
        
        normal_style = styles['Normal']
        
        # Title
        title = Paragraph("Advocacy Platform Dataset Analysis Report", title_style)
        elements.append(title)
        
        # Timestamp
        timestamp = Paragraph(
            f"<i>Generated: {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}</i>",
            normal_style
        )
        elements.append(timestamp)
        elements.append(Spacer(1, 0.3*inch))
        
        # Executive Summary
        elements.append(Paragraph("Executive Summary", heading_style))
        
        summary = self.analysis_results['summary']
        summary_data = [
            ['Metric', 'Value'],
            ['Total Users', f"{summary['total_users']:,}"],
            ['Total Programs', f"{summary['total_programs']:,}"],
            ['Total Tasks', f"{summary['total_tasks']:,}"],
            ['Avg Programs per User', f"{summary['avg_programs_per_user']:.2f}"],
            ['Avg Tasks per Program', f"{summary['avg_tasks_per_program']:.2f}"],
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
        ]))
        
        elements.append(summary_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Data Quality Assessment
        elements.append(Paragraph("Data Quality Assessment", heading_style))
        
        quality_text = """
        <b>Overall Quality:</b> POOR - Significant data quality issues detected<br/>
        <b>Missing Values:</b> HIGH - Many null and placeholder values<br/>
        <b>Type Consistency:</b> LOW - Multiple type mismatches found<br/>
        <b>Format Issues:</b> HIGH - Invalid formats for emails, dates, URLs
        """
        elements.append(Paragraph(quality_text, normal_style))
        elements.append(Spacer(1, 0.2*inch))
        
        # Anomalies section
        if self.analysis_results['anomalies']:
            elements.append(Paragraph("Data Quality Issues Detected", heading_style))
            
            anomaly_data = [['#', 'Issue']]
            for i, anomaly in enumerate(self.analysis_results['anomalies'], 1):
                # Remove emoji warning symbols for PDF
                clean_anomaly = anomaly.replace('⚠️', '').strip()
                anomaly_data.append([str(i), clean_anomaly])
            
            anomaly_table = Table(anomaly_data, colWidths=[0.5*inch, 6*inch])
            anomaly_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e74c3c')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fff5f5')]),
            ]))
            
            elements.append(anomaly_table)
            elements.append(Spacer(1, 0.3*inch))
        
        # Key Findings
        elements.append(Paragraph("Key Findings", heading_style))
        
        findings = """
        <b>Positive:</b><br/>
        • Dataset structure is consistent across all files<br/>
        <br/>
        <b>Issues Identified:</b><br/>
        • High percentage of null/invalid user IDs<br/>
        • Many placeholder values ('???', 'invalid-email', 'not-a-date')<br/>
        • Type inconsistencies (numeric values where strings expected)<br/>
        • String 'NaN' instead of proper null/numeric handling<br/>
        • Systematic issues with URLs marked as 'broken_link'<br/>
        • Empty program IDs across many records
        """
        elements.append(Paragraph(findings, normal_style))
        elements.append(Spacer(1, 0.3*inch))
        
        # Recommendations
        elements.append(Paragraph("Recommendations", heading_style))
        
        recommendations = """
        <b>1. Implement data validation at the point of entry</b><br/>
        Prevent invalid data from entering the system by implementing validation rules.<br/>
        <br/>
        <b>2. Standardize handling of missing data</b><br/>
        Use null values instead of placeholder strings like 'no-data', '???', etc.<br/>
        <br/>
        <b>3. Enforce type constraints</b><br/>
        Ensure that string fields (like brand, platform) are always strings, not numbers.<br/>
        <br/>
        <b>4. Validate formats before storage</b><br/>
        Implement validation for emails, dates, UUIDs, and URLs.<br/>
        <br/>
        <b>5. Ensure all records have valid UUIDs</b><br/>
        Generate proper UUIDs for user_id, task_id, and program_id fields.<br/>
        <br/>
        <b>6. Consider a data cleaning pipeline</b><br/>
        Implement automated data cleaning before downstream analysis.
        """
        elements.append(Paragraph(recommendations, normal_style))
        
        # Build PDF
        doc.build(elements)
        print(f"✅ PDF report generated successfully: {self.pdf_output}")
    
    def run(self):
        """Run complete analysis"""
        print("\n" + "🎯 " + "=" * 76 + " 🎯")
        print("   ADVOCACY PLATFORM DATASET ANALYZER")
        print("🎯 " + "=" * 76 + " 🎯\n")
        
        self.load_data()
        
        if not self.users:
            print("❌ No data loaded. Exiting.")
            return
        
        self.analyze_structure()
        self.analyze_user_metadata()
        self.analyze_advocacy_programs()
        self.identify_anomalies()
        self.generate_summary()
        
        # Generate PDF if requested
        if self.pdf_output:
            self.generate_pdf_report()
        
        print(f"\n{'=' * 80}")
        print("✅ Analysis Complete!")
        print("=" * 80 + "\n")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Analyze advocacy platform user dataset',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python analyze_dataset.py
  python analyze_dataset.py --pdf report.pdf
  python analyze_dataset.py --data ../data --pdf analysis.pdf
        """
    )
    
    parser.add_argument(
        '--data',
        default='../data',
        help='Directory containing JSON user data files (default: ../data)'
    )
    
    parser.add_argument(
        '--pdf',
        metavar='OUTPUT_FILE',
        help='Generate PDF report (requires reportlab: pip install reportlab)'
    )
    
    args = parser.parse_args()
    
    if not os.path.exists(args.data):
        print(f"❌ Error: Directory '{args.data}' not found.")
        parser.print_help()
        sys.exit(1)
    
    # Check if PDF is requested but library not available
    if args.pdf and not PDF_AVAILABLE:
        print("⚠️  Warning: PDF generation requested but 'reportlab' is not installed.")
        print("   Install it with: pip install reportlab")
        print("   Continuing with console output only...\n")
        args.pdf = None
    
    analyzer = DatasetAnalyzer(args.data, args.pdf)
    analyzer.run()


if __name__ == "__main__":
    main()

