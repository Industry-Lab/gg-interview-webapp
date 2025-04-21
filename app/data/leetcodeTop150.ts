// app/data/leetcodeTop150.ts
import { LeetCodeProblem } from '../models/leetcode';

// This is the comprehensive list of Top 150 LeetCode interview problems
export const leetcodeTop150: LeetCodeProblem[] = [
  // Two Sum - Always appears first
  {
    id: "1",
    title: "Two Sum",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Array", "Hash Table"],
    content: "<p>Given an array of integers <code>nums</code>&nbsp;and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>\n\n<p>You may assume that each input would have <strong><em>exactly</em> one solution</strong>, and you may not use the <em>same</em> element twice.</p>\n\n<p>You can return the answer in any order.</p>\n\n<p>&nbsp;</p>\n<p><strong class=\"example\">Example 1:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [2,7,11,15], target = 9\n<strong>Output:</strong> [0,1]\n<strong>Explanation:</strong> Because nums[0] + nums[1] == 9, we return [0, 1].\n</pre>\n\n<p><strong class=\"example\">Example 2:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [3,2,4], target = 6\n<strong>Output:</strong> [1,2]\n</pre>\n\n<p><strong class=\"example\">Example 3:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [3,3], target = 6\n<strong>Output:</strong> [0,1]\n</pre>\n\n<p>&nbsp;</p>\n<p><strong>Constraints:</strong></p>\n\n<ul>\n\t<li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li>\n\t<li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>\n\t<li><code>-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></code></li>\n\t<li><strong>Only one valid answer exists.</strong></li>\n</ul>\n\n<p>&nbsp;</p>\n<strong>Follow-up:&nbsp;</strong>Can you come up with an algorithm that is less than <code>O(n<sup>2</sup>)</code><font face=\"monospace\">&nbsp;</font>time complexity?",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    exampleTestcases: "[2,7,11,15]\n9\n[3,2,4]\n6\n[3,3]\n6",
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."],
    titleSlug: "two-sum"
  },
  
  // Array / String
  {
    id: "26",
    title: "Remove Duplicates from Sorted Array",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Array"],
    content: "Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same. Then return the number of unique elements in nums.",
    description: "Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same. Then return the number of unique elements in nums."
  },
  {
    id: "27",
    title: "Remove Element",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Array"],
    content: "Given an integer array nums and an integer val, remove all occurrences of val in nums in-place. The order of the elements may be changed. Then return the number of elements in nums which are not equal to val.",
    description: "Given an integer array nums and an integer val, remove all occurrences of val in nums in-place. The order of the elements may be changed. Then return the number of elements in nums which are not equal to val."
  },
  {
    id: "88",
    title: "Merge Sorted Array",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Array", "Two Pointers", "Sorting"],
    content: "You are given two integer arrays nums1 and nums2, sorted in non-decreasing order, and two integers m and n, representing the number of elements in nums1 and nums2 respectively. Merge nums1 and nums2 into a single array sorted in non-decreasing order.",
    description: "You are given two integer arrays nums1 and nums2, sorted in non-decreasing order, and two integers m and n, representing the number of elements in nums1 and nums2 respectively. Merge nums1 and nums2 into a single array sorted in non-decreasing order."
  },
  {
    id: "169",
    title: "Majority Element",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Array", "Hash Table", "Divide and Conquer"],
    content: "Given an array nums of size n, return the majority element. The majority element is the element that appears more than ⌊n / 2⌋ times. You may assume that the majority element always exists in the array.",
    description: "Given an array nums of size n, return the majority element. The majority element is the element that appears more than ⌊n / 2⌋ times. You may assume that the majority element always exists in the array."
  },
  {
    id: "121",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Array", "Dynamic Programming"],
    content: "You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
    description: "You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0."
  },
  {
    id: "122",
    title: "Best Time to Buy and Sell Stock II",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Dynamic Programming", "Greedy"],
    content: "You are given an integer array prices where prices[i] is the price of a given stock on the ith day. On each day, you may decide to buy and/or sell the stock. You can only hold at most one share of the stock at any time. However, you can buy it then immediately sell it on the same day. Find and return the maximum profit you can achieve.",
    description: "You are given an integer array prices where prices[i] is the price of a given stock on the ith day. On each day, you may decide to buy and/or sell the stock. You can only hold at most one share of the stock at any time. However, you can buy it then immediately sell it on the same day. Find and return the maximum profit you can achieve."
  },
  {
    id: "12",
    title: "Integer to Roman",
    difficulty: "Medium",
    hasSolution: true,
    category: ["String", "Math"],
    content: "Given an integer, convert it to a roman numeral.",
    description: "Given an integer, convert it to a roman numeral."
  },
  {
    id: "13",
    title: "Roman to Integer",
    difficulty: "Easy",
    hasSolution: true,
    category: ["String", "Math"],
    content: "Given a roman numeral, convert it to an integer.",
    description: "Given a roman numeral, convert it to an integer."
  },
  {
    id: "14",
    title: "Longest Common Prefix",
    difficulty: "Easy",
    hasSolution: true,
    category: ["String"],
    content: "Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string \"\".",
    description: "Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string \"\"."
  },
  {
    id: "151",
    title: "Reverse Words in a String",
    difficulty: "Medium",
    hasSolution: true,
    category: ["String"],
    content: "Given an input string, reverse the string word by word.",
    description: "Given an input string, reverse the string word by word."
  },
  {
    id: "6",
    title: "Zigzag Conversion",
    difficulty: "Medium",
    hasSolution: true,
    category: ["String"],
    content: "The string \"PAYPALISHIRING\" is written in a zigzag pattern on a given number of rows.",
    description: "The string \"PAYPALISHIRING\" is written in a zigzag pattern on a given number of rows."
  },
  {
    id: "28",
    title: "Find the Index of the First Occurrence in a String",
    difficulty: "Easy",
    hasSolution: true,
    category: ["String", "Two Pointers"],
    content: "Implement strStr(). Given two strings needle and haystack, return the index of the first occurrence of needle in haystack, or -1 if needle is not part of haystack.",
    description: "Implement strStr(). Given two strings needle and haystack, return the index of the first occurrence of needle in haystack, or -1 if needle is not part of haystack."
  },
  {
    id: "68",
    title: "Text Justification",
    difficulty: "Hard",
    hasSolution: true,
    category: ["String"],
    content: "Given an array of strings words and a width maxWidth, format the text such that each line has exactly maxWidth characters and is fully (left and right) justified.",
    description: "Given an array of strings words and a width maxWidth, format the text such that each line has exactly maxWidth characters and is fully (left and right) justified."
  },
  {
    id: "125",
    title: "Valid Palindrome",
    difficulty: "Easy",
    hasSolution: true,
    category: ["String", "Two Pointers"],
    content: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.",
    description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers."
  },
  {
    id: "392",
    title: "Is Subsequence",
    difficulty: "Easy",
    hasSolution: true,
    category: ["String", "Dynamic Programming"],
    content: "Given two strings s and t, return true if s is a subsequence of t, or false otherwise.",
    description: "Given two strings s and t, return true if s is a subsequence of t, or false otherwise."
  },
  
  // Two Pointers
  {
    id: "167",
    title: "Two Sum II - Input Array Is Sorted",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Two Pointers", "Binary Search"],
    content: "Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number.",
    description: "Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number."
  },
  {
    id: "15",
    title: "3Sum",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Two Pointers", "Sorting"],
    content: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
    description: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0."
  },
  {
    id: "42",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    hasSolution: true,
    category: ["Array", "Two Pointers", "Dynamic Programming"],
    content: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    description: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining."
  },
  {
    id: "11",
    title: "Container With Most Water",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Two Pointers", "Greedy"],
    content: "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water.",
    description: "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water."
  },
  
  // Sliding Window
  {
    id: "209",
    title: "Minimum Size Subarray Sum",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Sliding Window"],
    content: "Given an array of positive integers nums and a positive integer target, return the minimal length of a contiguous subarray [numsl, numsl+1, ..., numsr-1, numsr] of which the sum is greater than or equal to target. If there is no such subarray, return 0 instead.",
    description: "Given an array of positive integers nums and a positive integer target, return the minimal length of a contiguous subarray [numsl, numsl+1, ..., numsr-1, numsr] of which the sum is greater than or equal to target. If there is no such subarray, return 0 instead."
  },
  {
    id: "3",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    hasSolution: true,
    category: ["String", "Sliding Window", "Hash Table"],
    content: "Given a string s, find the length of the longest substring without repeating characters.",
    description: "Given a string s, find the length of the longest substring without repeating characters."
  },
  {
    id: "30",
    title: "Substring with Concatenation of All Words",
    difficulty: "Hard",
    hasSolution: true,
    category: ["String", "Sliding Window", "Hash Table"],
    content: "You are given a string s and an array of strings words. All the strings of words are of the same length. A concatenated substring in s is a substring that contains all the strings of any permutation of words concatenated.",
    description: "You are given a string s and an array of strings words. All the strings of words are of the same length. A concatenated substring in s is a substring that contains all the strings of any permutation of words concatenated."
  },
  {
    id: "76",
    title: "Minimum Window Substring",
    difficulty: "Hard",
    hasSolution: true,
    category: ["String", "Sliding Window", "Hash Table"],
    content: "Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string \"\".",
    description: "Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string \"\"."
  },
  
  // Matrix
  {
    id: "36",
    title: "Valid Sudoku",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Matrix", "Hash Table"],
    content: "Determine if a 9 x 9 Sudoku board is valid. Only the filled cells need to be validated according to the following rules...",
    description: "Determine if a 9 x 9 Sudoku board is valid. Only the filled cells need to be validated according to the following rules..."
  },
  {
    id: "54",
    title: "Spiral Matrix",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Matrix"],
    content: "Given an m x n matrix, return all elements of the matrix in spiral order.",
    description: "Given an m x n matrix, return all elements of the matrix in spiral order."
  },
  {
    id: "48",
    title: "Rotate Image",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Matrix"],
    content: "You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise).",
    description: "You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise)."
  },
  {
    id: "240",
    title: "Search a 2D Matrix II",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Binary Search", "Matrix"],
    content: "Write an efficient algorithm that searches for a value target in an m x n integer matrix matrix. This matrix has the following properties...",
    description: "Write an efficient algorithm that searches for a value target in an m x n integer matrix matrix. This matrix has the following properties..."
  },
  {
    id: "73",
    title: "Set Matrix Zeroes",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Matrix"],
    content: "Given an m x n integer matrix matrix, if an element is 0, set its entire row and column to 0's.",
    description: "Given an m x n integer matrix matrix, if an element is 0, set its entire row and column to 0's."
  },
  {
    id: "289",
    title: "Game of Life",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Matrix"],
    content: "The board is made up of an m x n grid of cells, where each cell has an initial state: live (represented by a 1) or dead (represented by a 0).",
    description: "The board is made up of an m x n grid of cells, where each cell has an initial state: live (represented by a 1) or dead (represented by a 0)."
  },
  
  // Hash Map
  {
    id: "383",
    title: "Ransom Note",
    difficulty: "Easy",
    hasSolution: true,
    category: ["String", "Hash Table"],
    content: "Given two strings ransomNote and magazine, return true if ransomNote can be constructed by using the letters from magazine and false otherwise.",
    description: "Given two strings ransomNote and magazine, return true if ransomNote can be constructed by using the letters from magazine and false otherwise."
  },
  
  // Linked List
  {
    id: "141",
    title: "Linked List Cycle",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Linked List", "Two Pointers"],
    content: "Given head, the head of a linked list, determine if the linked list has a cycle in it.",
    description: "Given head, the head of a linked list, determine if the linked list has a cycle in it."
  },
  {
    id: "2",
    title: "Add Two Numbers",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Linked List", "Math"],
    content: "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.",
    description: "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list."
  },
  
  // Stack
  {
    id: "20",
    title: "Valid Parentheses",
    difficulty: "Easy",
    hasSolution: true,
    category: ["String", "Stack"],
    content: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid."
  },
  {
    id: "71",
    title: "Simplify Path",
    difficulty: "Medium",
    hasSolution: true,
    category: ["String", "Stack"],
    content: "Given a string path, which is an absolute path (starting with a slash '/') to a file or directory in a Unix-style file system, convert it to the simplified canonical path.",
    description: "Given a string path, which is an absolute path (starting with a slash '/') to a file or directory in a Unix-style file system, convert it to the simplified canonical path."
  },
  
  // Tree
  {
    id: "104",
    title: "Maximum Depth of Binary Tree",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Tree", "Depth-First Search", "Binary Tree"],
    content: "Given the root of a binary tree, return its maximum depth.",
    description: "Given the root of a binary tree, return its maximum depth."
  },
  {
    id: "100",
    title: "Same Tree",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Tree", "Depth-First Search", "Binary Tree"],
    content: "Given the roots of two binary trees p and q, write a function to check if they are the same or not.",
    description: "Given the roots of two binary trees p and q, write a function to check if they are the same or not."
  },
  
  // Graph
  {
    id: "133",
    title: "Clone Graph",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Graph", "Depth-First Search", "Breadth-First Search"],
    content: "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.",
    description: "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph."
  },
  {
    id: "200",
    title: "Number of Islands",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Graph", "Depth-First Search", "Breadth-First Search", "Union Find"],
    content: "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands.",
    description: "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands."
  },
  
  // Binary Search
  {
    id: "35",
    title: "Search Insert Position",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Array", "Binary Search"],
    content: "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.",
    description: "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order."
  },
  {
    id: "74",
    title: "Search a 2D Matrix",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Binary Search", "Matrix"],
    content: "Write an efficient algorithm that searches for a value target in an m x n integer matrix matrix. This matrix has the following properties: Integers in each row are sorted from left to right. The first integer of each row is greater than the last integer of the previous row.",
    description: "Write an efficient algorithm that searches for a value target in an m x n integer matrix matrix. This matrix has the following properties: Integers in each row are sorted from left to right. The first integer of each row is greater than the last integer of the previous row."
  },
  
  // Dynamic Programming
  {
    id: "70",
    title: "Climbing Stairs",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Math", "Dynamic Programming"],
    content: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?"
  },
  {
    id: "198",
    title: "House Robber",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Dynamic Programming"],
    content: "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night.",
    description: "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night."
  },
  
  // Add more problems here to reach 150
  {
    id: "217",
    title: "Contains Duplicate",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Array", "Hash Table"],
    content: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
    description: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct."
  },
  {
    id: "49",
    title: "Group Anagrams",
    difficulty: "Medium",
    hasSolution: true,
    category: ["Array", "Hash Table", "String"],
    content: "Given an array of strings strs, group the anagrams together. You can return the answer in any order.",
    description: "Given an array of strings strs, group the anagrams together. You can return the answer in any order."
  },
  {
    id: "242",
    title: "Valid Anagram",
    difficulty: "Easy",
    hasSolution: true,
    category: ["Hash Table", "String", "Sorting"],
    content: "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
    description: "Given two strings s and t, return true if t is an anagram of s, and false otherwise."
  }
];
