// app/api/leetcode/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Try to fetch the official list of 150 top interview problems
    try {
      const response = await fetch('https://raw.githubusercontent.com/bollwarm/leetcode/master/leetcode_all.json');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Successfully fetched the full LeetCode problems list');
        return NextResponse.json(data);
      }
    } catch (apiError) {
      console.log('GitHub API unavailable, trying local API');
    }
    
    // If GitHub fails, try our local API
    try {
      const response = await fetch('http://localhost:8080/api/leetcode/detailed-problems');
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (apiError) {
      console.log('Remote API unavailable, falling back to mock data');
    }
    
    // If the API request fails, return detailed mock data
    return NextResponse.json([
      {
        id: "88",
        title: "Merge Sorted Array",
        difficulty: "Easy",
        url: "https://leetcode.com/problems/merge-sorted-array",
        category: ["Array", "Two Pointers", "Sorting"],
        titleSlug: "merge-sorted-array",
        content: `<p>You are given two integer arrays <code>nums1</code> and <code>nums2</code>, sorted in <strong>non-decreasing order</strong>, and two integers <code>m</code> and <code>n</code>, representing the number of elements in <code>nums1</code> and <code>nums2</code> respectively.</p>

<p>Merge <code>nums1</code> and <code>nums2</code> into a single array sorted in <strong>non-decreasing order</strong>.</p>

<p>The final sorted array should not be returned by the function, but instead be <strong>stored inside the array</strong> <code>nums1</code>. To accommodate this, <code>nums1</code> has a length of <code>m + n</code>, where the first <code>m</code> elements denote the elements that should be merged, and the last <code>n</code> elements are set to <code>0</code> and should be ignored. <code>nums2</code> has a length of <code>n</code>.</p>`,
        exampleTestcases: `Input: nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3
Output: [1,2,2,3,5,6]
Explanation: The arrays we are merging are [1,2,3] and [2,5,6].
The result of the merge is [1,2,2,3,5,6] with the underlined elements coming from nums1.

Input: nums1 = [1], m = 1, nums2 = [], n = 0
Output: [1]
Explanation: The arrays we are merging are [1] and [].
The result of the merge is [1].

Input: nums1 = [0], m = 0, nums2 = [1], n = 1
Output: [1]
Explanation: The arrays we are merging are [] and [1].
The result of the merge is [1].
Note that because m = 0, there are no elements in nums1. The 0 is only there to ensure the merge result can fit in nums1.`,
        constraints: [
          "nums1.length == m + n",
          "nums2.length == n",
          "0 <= m, n <= 200",
          "1 <= m + n <= 200",
          "-10^9 <= nums1[i], nums2[j] <= 10^9"
        ]
      },
      {
        id: "1",
        title: "Two Sum",
        difficulty: "Easy",
        url: "https://leetcode.com/problems/two-sum",
        category: ["Array", "Hash Table"],
        titleSlug: "two-sum",
        content: `<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>

<p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the <em>same</em> element twice.</p>

<p>You can return the answer in any order.</p>`,
        exampleTestcases: `Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Input: nums = [3,2,4], target = 6
Output: [1,2]

Input: nums = [3,3], target = 6
Output: [0,1]`,
        constraints: [
          "2 <= nums.length <= 10^4",
          "-10^9 <= nums[i] <= 10^9",
          "-10^9 <= target <= 10^9",
          "Only one valid answer exists."
        ]
      },
      {
        id: "200",
        title: "Number of Islands",
        difficulty: "Medium",
        url: "https://leetcode.com/problems/number-of-islands",
        category: ["Array", "Depth-First Search", "Breadth-First Search", "Union Find", "Matrix"],
        titleSlug: "number-of-islands",
        content: `<p>Given an <code>m x n</code> 2D binary grid <code>grid</code> which represents a map of <code>'1'</code>s (land) and <code>'0'</code>s (water), return <em>the number of islands</em>.</p>

<p>An <strong>island</strong> is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.</p>`,
        exampleTestcases: `Input: grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]
Output: 1

Input: grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
Output: 3`,
        constraints: [
          "m == grid.length",
          "n == grid[i].length",
          "1 <= m, n <= 300",
          "grid[i][j] is '0' or '1'."
        ]
      }
    ]);
  } catch (error) {
    console.error('Error providing LeetCode problems:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LeetCode problems' },
      { status: 500 }
    );
  }
}
