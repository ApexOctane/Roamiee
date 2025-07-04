#!/usr/bin/env python
# coding: utf-8

import warnings
warnings.filterwarnings('ignore')

from crewai import Agent, Task, Crew
import os
from utils import get_openai_api_key

# Set API key
openai_api_key = get_openai_api_key()
os.environ["OPENAI_MODEL_NAME"] = 'gpt-3.5-turbo'
os.environ["OPENAI_API_KEY"] = openai_api_key

# Fast Route Planner Agent
route_planner = Agent(
    role="Route Planner",
    goal="Find the fastest route from {current_location} to {destination} using major highways",
    backstory="You're a navigation expert. Your job is to get travelers to their destination quickly using the fastest highways and avoiding unnecessary delays.",
    allow_delegation=False,
    verbose=True
)

# Destination Activity Suggester
activity_suggester = Agent(
    role="Activity Suggester",
    goal="Find the most interesting things to do in {destination} for a {days}-day trip within the user's budget and dates, and additional out-of-budget options",
    backstory="You're a local guide expert helping travelers make the most of their time at their destination. Focus on unique, memorable experiences that are budget-aware and available on the travel dates.",
    allow_delegation=False,
    verbose=True
)

# Restaurant Finder (Diet-aware)
restaurant_finder = Agent(
    role="Restaurant Finder",
    goal="Find restaurants in {destination} that meet the user's diet preference (e.g., halal, kosher, vegetarian)",
    backstory="You're a food scout who can locate restaurants based on religious or dietary preferences and note their costs.",
    allow_delegation=False,
    verbose=True
)

# Attraction Finder
attraction_finder = Agent(
    role="Attraction Finder",
    goal="Find interesting attractions and landmarks in {destination} open on the travel dates within the user's budget, and list some optional out-of-budget extras",
    backstory="You're a travel researcher focused on helping tourists explore key attractions, parks, and landmarks while being mindful of budget and checking availability based on the trip dates.",
    allow_delegation=False,
    verbose=True
)

# Accommodation Finder
accommodation_finder = Agent(
    role="Accommodation Finder",
    goal="Find hotels in {destination} based on travelers' preferences, number of guests, hotel brand, and budget",
    backstory="You're a hospitality expert who finds hotel accommodations suited for families and group sizes with pricing estimates, including preferred brands.",
    allow_delegation=False,
    verbose=True
)

# Travel Writer
travel_writer = Agent(
    role="Travel Writer",
    goal="Write an exciting and budget-aware {days}-day trip itinerary to {destination} starting from {start_date} with a total budget of ${budget}",
    backstory="You’re a seasoned travel writer. Use the inputs from other agents to craft a compelling, engaging itinerary with total cost calculated and compared directly against the user's specified budget.",
    allow_delegation=False,
    verbose=True
)

# Itinerary Editor
itinerary_editor = Agent(
    role="Itinerary Editor",
    goal="Polish the trip itinerary for clarity, excitement, flow, and ensure budget alignment",
    backstory="You’re a professional editor. Your job is to ensure the trip itinerary is well-structured, readable, and budget-conscious.",
    allow_delegation=False,
    verbose=True
)

# Tasks
plan_route = Task(
    description="Find the fastest route from {current_location} to {destination} using major highways. Include estimated time and distance.",
    expected_output="A fast route with highways, total time and distance.",
    agent=route_planner
)

suggest_activities = Task(
    description="List 5–7 fun and unique activities to do in {destination} during a {days}-day trip starting on {start_date}. Flag those that are out of budget as optional extras and confirm their availability on the given dates.",
    expected_output="List of activities with short descriptions, pricing notes, and date-based availability.",
    agent=activity_suggester
)

find_restaurants = Task(
    description="Find restaurants in {destination} that fit the diet type {diet_type}. Include name, cuisine, rating, and a one-line review, and approximate pricing.",
    expected_output="List of restaurants with dietary alignment, brief details, and estimated cost.",
    agent=restaurant_finder
)

find_attractions = Task(
    description="Find top tourist attractions in {destination} for a {days}-day stay starting on {start_date}. Stay within the user's budget and mention optional out-of-budget extras. Ensure attractions are open on the specific dates.",
    expected_output="List of attractions with descriptions, pricing, open dates, and budget suitability.",
    agent=attraction_finder
)

find_accommodations = Task(
    description="Find hotel options in {destination} for {adults} adults and {children} children based on {hotel_type} budget, preferred hotel brand {hotel_brand}, and number of days {days}. Include price per night and total estimated cost.",
    expected_output="List of hotels with room types, price per night, total cost, and family suitability.",
    agent=accommodation_finder
)

write_itinerary = Task(
    description="Create a detailed and engaging {days}-day itinerary in markdown format starting on {start_date} using route, activities, attractions, food, and hotel info. Include full cost breakdown (hotel + fuel + food) and compare the total to the provided budget (${budget}). Clearly state if the trip is within or exceeds the budget.",
    expected_output="Trip itinerary in markdown format with estimated costs, breakdowns, and budget comparison against the provided budget.",
    agent=travel_writer
)

edit_itinerary = Task(
    description="Polish and finalize the markdown itinerary. Ensure clarity, flow, excitement, and budget accountability.",
    expected_output="Final edited itinerary in markdown.",
    agent=itinerary_editor
)

# Run function with input prompts
def generate_weekend_road_trip():
    current_location = input("Enter starting location: ")
    destination = input("Enter destination: ")
    adults = input("How many adults? ")
    children = input("How many children? ")
    hotel_type = input("Preferred hotel type (budget/mid-range/luxury): ")
    hotel_brand = input("Preferred hotel brand (e.g., Holiday Inn Express, Marriott, etc.): ")
    diet_type = input("Enter dietary preference (e.g., Halal, Kosher, Vegetarian): ")
    fuel_efficiency = float(input("Fuel efficiency (miles per gallon): "))
    gas_price = input("Gas price per gallon (default $3.50): ") or "3.50"
    days = input("How many days is the trip? ")
    start_date = input("Enter the start date of the trip (YYYY-MM-DD): ")
    budget = float(input("What is your maximum total budget for the trip (in USD)? "))

    crew = Crew(
        agents=[
            route_planner, activity_suggester, restaurant_finder, attraction_finder,
            accommodation_finder, travel_writer, itinerary_editor
        ],
        tasks=[
            plan_route, suggest_activities, find_restaurants, find_attractions,
            find_accommodations, write_itinerary, edit_itinerary
        ],
        verbose=2
    )

    result = crew.kickoff(inputs={
        "current_location": current_location,
        "destination": destination,
        "adults": adults,
        "children": children,
        "hotel_type": hotel_type,
        "hotel_brand": hotel_brand,
        "diet_type": diet_type,
        "fuel_efficiency": fuel_efficiency,
        "gas_price": gas_price,
        "days": days,
        "start_date": start_date,
        "budget": budget
    })
    print(result)

if __name__ == "__main__":
    generate_weekend_road_trip()

from IPython.display import Markdown, display

openai_api_key = os.getenv("OPENAI_API_KEY")

from utils import get_openai_api_key
openai_api_key = get_openai_api_key()

import os
os.environ["OPENAI_API_KEY"] = "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"
openai_api_key = os.environ["OPENAI_API_KEY"]






