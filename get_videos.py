# get_videos.py - With diagnostic change for 'year' filter

import praw
import json
import sys
import time
import os

# --- Credentials (Read from Environment Variables) ---
CLIENT_ID = os.environ.get("REDDIT_CLIENT_ID")
CLIENT_SECRET = os.environ.get("REDDIT_CLIENT_SECRET")
USERNAME = os.environ.get("REDDIT_USERNAME")
PASSWORD = os.environ.get("REDDIT_PASSWORD")
# User-Agent - important to customize with your app name and Reddit username
USER_AGENT = f"MangoPlayerApp/Diagnostic/1.2 by u/{USERNAME or 'YourRedditUsername'}"

# --- Check if Credentials are Loaded ---
if not all([CLIENT_ID, CLIENT_SECRET, USERNAME, PASSWORD]):
    print("CRITICAL ERROR: Credentials not found in environment variables. Exiting.")
    print("Ensure REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD are set.")
    sys.exit(1)

# --- Function to Fetch and Save Data ---
def fetch_and_save(subreddit_name, sort_method, time_filter, post_limit, output_filename, reddit_instance):
    """Fetches posts based on parameters and saves them to a JSON file."""
    print("-" * 40)
    fetch_description = f"r/{subreddit_name}, Sort: {sort_method}"
    if sort_method == 'top': # time_filter is only relevant for 'top' sort
        fetch_description += f", Filter: {time_filter}"
    fetch_description += f", Limit: {post_limit}"
    print(f"Starting fetch for: {fetch_description}")
    
    video_links = []
    processed_count = 0
    error_count = 0
    skipped_media_count = 0
    skipped_domain_count = 0

    try:
        subreddit = reddit_instance.subreddit(subreddit_name)
        print("Fetching submissions list from Reddit API...")
        
        submission_generator = None
        if sort_method == 'hot':
            submission_generator = subreddit.hot(limit=post_limit)
        elif sort_method == 'top':
            if not time_filter: # Should not happen if logic is correct, but good check
                print(f"ERROR: time_filter is missing for 'top' sort. Skipping {output_filename}.")
                return False
            submission_generator = subreddit.top(time_filter=time_filter, limit=post_limit)
        else:
            print(f"ERROR: Unknown sort_method '{sort_method}' for {output_filename}")
            return False

        retrieved_submissions = []
        if submission_generator:
            for submission in submission_generator:
                retrieved_submissions.append(submission)
                if len(retrieved_submissions) >= post_limit: # Manual check against limit
                    break 
        
        print(f"Retrieved {len(retrieved_submissions)} submission objects from API for {fetch_description.split(', Limit:')[0]}.")

        for i, submission in enumerate(retrieved_submissions):
            processed_count += 1
            try:
                if submission.domain == 'v.redd.it' and getattr(submission, 'is_video', False):
                    if getattr(submission, 'media', None) and 'reddit_video' in submission.media:
                        video_data = submission.media['reddit_video']
                        hls_url = video_data.get('hls_url')
                        dash_url = video_data.get('dash_url')
                        fallback_url = video_data.get('fallback_url')
                        chosen_url = hls_url or dash_url or fallback_url
                        url_type = "hls" if hls_url else ("dash" if dash_url else "fallback")

                        if chosen_url:
                            video_links.append({
                                "title": submission.title, "score": submission.score,
                                "url": chosen_url, "permalink": f"https://reddit.com{submission.permalink}",
                                "type": url_type
                            })
                        else: skipped_media_count += 1
                    else: skipped_media_count += 1
                else: skipped_domain_count += 1
            
            except praw.exceptions.PRAWException as e_inner:
                 print(f"\nWarning (Index {i}): PRAW error processing sub '{getattr(submission, 'id', 'N/A')}': {e_inner}. Skipping.")
                 error_count += 1
            except Exception as e_inner:
                 print(f"\nWarning (Index {i}): Unexpected error processing sub '{getattr(submission, 'id', 'N/A')}': {e_inner}. Skipping.")
                 error_count += 1

        print(f"Finished iterating {processed_count} submissions from API.")

    except praw.exceptions.PRAWException as e:
        print(f"\nERROR: PRAW error during fetch setup for {fetch_description.split(', Limit:')[0]}: {e}")
        return False
    except Exception as e:
        print(f"\nERROR: Unexpected error during fetch setup for {fetch_description.split(', Limit:')[0]}: {e}")
        return False

    print(f"\nSummary for {fetch_description.split(', Limit:')[0]}: Processed: {processed_count}, Found Videos: {len(video_links)}, Skipped Media: {skipped_media_count}, Skipped Domain: {skipped_domain_count}, Errors: {error_count}")

    if not video_links and processed_count > 0 :
        print(f"Result: No v.redd.it links found among the top {processed_count} posts processed.")
        video_links = []

    print(f"Saving list with {len(video_links)} videos to {output_filename}...")
    try:
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(video_links, f, indent=2, ensure_ascii=False)
        print(f"Successfully saved to {output_filename}.")
        return True
    except Exception as e:
        print(f"ERROR: Could not save JSON file '{output_filename}': {e}")
        return False

# --- Main Execution ---
if __name__ == "__main__":
    print("="*50)
    print("Starting Reddit Data Fetch Script (Diagnostic for 'year' filter)")
    print("="*50)
    
    if not all([CLIENT_ID, CLIENT_SECRET, USERNAME, PASSWORD]):
         print("CRITICAL ERROR: Credentials not found in environment variables. Exiting.")
         print("Ensure REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD are set.")
         sys.exit(1)
         
    print("Attempting to authenticate with Reddit...")
    try:
        reddit = praw.Reddit(
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET,
            user_agent=USER_AGENT,
            username=USERNAME,
            password=PASSWORD,
            check_for_async=False
        )
        authenticated_user = reddit.user.me()
        print(f"Successfully authenticated as: {authenticated_user}")
    except Exception as e:
        print(f"ERROR: Authentication failed: {e}")
        print("Please double-check credentials stored in environment variables/GitHub Secrets.")
        sys.exit(1)

    # --- Define Fetch Configurations ---
    fetch_configs = [
        {'sort': 'hot',   'tf': None,    'limit': 100, 'file': 'videos_hot.json'},
        {'sort': 'top',   'tf': 'hour',  'limit': 100, 'file': 'videos_hour.json'},
        {'sort': 'top',   'tf': 'day',   'limit': 100, 'file': 'videos_day.json'},
        {'sort': 'top',   'tf': 'week',  'limit': 100, 'file': 'videos_week.json'},
        {'sort': 'top',   'tf': 'month', 'limit': 200, 'file': 'videos_month.json'},
        {'sort': 'top',   'tf': 'year',  'limit': 200, 'file': 'videos_year.json'}, # This will be tested
        {'sort': 'top',   'tf': 'all',   'limit': 200, 'file': 'videos_all_time.json'}
    ]

    all_success = True
    # --- Fetch All Lists ---
    for config in fetch_configs:
        current_subreddit_name = "all" # Default to r/all
        
        # *** TEMPORARY DIAGNOSTIC CHANGE FOR 'YEAR' FILTER ***
        if config['sort'] == 'top' and config['tf'] == 'year':
            current_subreddit_name = "videos" # Test with r/videos instead of r/all
            print(f"***** DIAGNOSTIC: For 'year' filter, fetching from r/{current_subreddit_name} instead of r/all *****")

        success = fetch_and_save(
            subreddit_name=current_subreddit_name, # Use the potentially modified subreddit name
            sort_method=config['sort'],
            time_filter=config['tf'],
            post_limit=config['limit'],
            output_filename=config['file'], # Will still save to videos_year.json for the test
            reddit_instance=reddit
        )
        if not success:
            all_success = False
            print(f"##### WARNING: Fetch or save FAILED for config: {config} on subreddit {current_subreddit_name}. #####")
        
        if len(fetch_configs) > 1: # Don't sleep if only one config for some reason
            print(f"Waiting 2 seconds before next fetch...")
            time.sleep(2) 

    print("="*50)
    if all_success:
        print("Script finished: All datasets fetched and saved successfully.")
    else:
        print("Script finished: WARNING - One or more datasets may have failed to fetch or save completely.")
    print("="*50)
    sys.exit(0 if all_success else 1)