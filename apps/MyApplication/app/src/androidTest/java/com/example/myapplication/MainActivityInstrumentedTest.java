package com.example.myapplication;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class MainActivityInstrumentedTest {

    @Test
    public void mutationOperatorAdd_isCorrect() {
        assertEquals(5, MainActivity.mutationOperatorAdd(2, 3));
    }
}
