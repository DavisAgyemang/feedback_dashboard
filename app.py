from Feedback.feedback_mechanism import FeedbackMechanism
import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()

# feedback mechanism
STORAGE_CONNECTION_STRING = os.getenv("STORAGE_CONNECTION_STRING")
TABLE_NAME = os.getenv("TABLE_NAME")
app = Flask(__name__)
fbm = FeedbackMechanism(storage_connection_string=STORAGE_CONNECTION_STRING, table_name=TABLE_NAME)

df = fbm.table_to_pandas()

AI_MODELS = df['AI_Model'].unique().tolist()
AI_MODELS.sort()
PROJECT_NAMES = df['Project_Name'].unique().tolist()
PROJECT_NAMES.sort()


@app.route('/')
def index():
    return render_template('index.html', ai_models=AI_MODELS, project_names=PROJECT_NAMES)


@app.route('/api/data', methods=['GET'])
def get_data():
    """API endpoint to get filtered data based on query parameters."""

    filtered_df = df.copy()

    # --- Collect and Apply Filters ---

    # 1. AI Model Filter (Dropdown - exact match)
    ai_model = request.args.get('ai_model')
    if ai_model and ai_model != 'All':
        filtered_df = filtered_df[filtered_df['AI_Model'] == ai_model]

    # 2. Project Name Filter (Dropdown - exact match)
    project_name = request.args.get('project_name')
    if project_name and project_name != 'All':
        filtered_df = filtered_df[filtered_df['Project_Name'] == project_name]

    # 3. Thumbs Filter (Selection - exact match)
    thumbs = request.args.get('thumbs')
    if thumbs and thumbs != 'All':
        filtered_df = filtered_df[filtered_df['Thumbs'] == thumbs]

    # 4. User Query Filter (Text input - case-insensitive partial match)
    user_query = request.args.get('user_query', '').strip()
    if user_query:
        # Search the 'User_Query' column
        filtered_df = filtered_df[
            filtered_df['User_Query'].str.contains(user_query, case=False, na=False)
        ]

    # --- Prepare Response ---

    # Convert the filtered DataFrame to a list of dictionaries (records)
    records = filtered_df.to_dict('records')

    # Get the column names (for the table header)
    columns = filtered_df.columns.tolist()

    return jsonify({
        'data': records,
        'columns': columns,
        'count': len(records)
    })


# --- 3. RUN THE APP ---
if __name__ == '__main__':
    app.run(debug=True)

