'use client';
import { useOverflowSnapshot } from "./useOverflowSnapshot.js";
/**
 * @returns Number of items that are overflowing
 */ export const useOverflowCount = ()=>useOverflowSnapshot(selectInvisibleItemCount);
const selectInvisibleItemCount = (snapshot)=>snapshot.invisibleItemCount;
